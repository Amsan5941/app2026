"""
User Profile API Routes

Endpoints:
  GET  /api/v1/profile/{user_id}         → Get user profile with macro targets
  PUT  /api/v1/profile/{user_id}/macros   → Update macro targets
"""

from app.models.food_model import MacroTargetsUpdate
from fastapi import APIRouter, HTTPException

from app.services import supabase_service

router = APIRouter()


async def _resolve_user_id(identifier: str) -> str:
    """Resolve a user identifier to an internal user_id."""
    client = supabase_service.get_client()
    result = client.table("users").select("id").eq("id", identifier).execute()
    if result.data:
        return result.data[0]["id"]

    resolved = await supabase_service.get_user_id_from_auth(identifier)
    if resolved:
        return resolved

    raise HTTPException(status_code=404, detail="User not found")


@router.get("/profile/{user_id}")
async def get_user_profile(user_id: str):
    """Get user profile including bio_profile with macro targets."""
    try:
        resolved_id = await _resolve_user_id(user_id)
        client = supabase_service.get_client()

        # Get user data
        user_result = client.table("users").select("*").eq("id", resolved_id).execute()
        user_data = user_result.data[0] if user_result.data else None

        # Get bio_profile with macro targets
        bio_result = (
            client.table("bio_profile")
            .select("*")
            .eq("user_id", resolved_id)
            .execute()
        )
        bio_data = bio_result.data[0] if bio_result.data else None

        return {
            "success": True,
            "user": user_data,
            "bio_profile": bio_data,
            "macro_targets": {
                "calorie_goal": bio_data.get("calorie_goal") if bio_data else None,
                "protein_target": bio_data.get("protein_target") if bio_data else None,
                "carbs_target": bio_data.get("carbs_target") if bio_data else None,
                "fat_target": bio_data.get("fat_target") if bio_data else None,
            } if bio_data else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/profile/{user_id}/macros")
async def update_macro_targets(user_id: str, targets: MacroTargetsUpdate):
    """Update daily macro targets for a user."""
    try:
        resolved_id = await _resolve_user_id(user_id)
        result = await supabase_service.update_macro_targets(resolved_id, targets)
        if not result:
            raise HTTPException(status_code=404, detail="Bio profile not found. Create one first.")
        return {"success": True, "data": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
