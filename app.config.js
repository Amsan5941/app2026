// Loads .env into process.env for local development and ensures
// EXPO_PUBLIC_* variables are available to Expo at build time.
require("dotenv").config();

module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
  };
};
