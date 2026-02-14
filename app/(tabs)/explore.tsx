import { Palette, Radii, Spacing } from "@/constants/theme";
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

// ── Macro Ring ──────────────────────────────────────────────
function MacroRing({
  consumed,
  target,
  label,
  color,
  size = 80,
}: {
  consumed: number;
  target: number;
  label: string;
  color: string;
  size?: number;
}) {
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(consumed / target, 1);
  const center = size / 2;

  return (
    <View style={macroStyles.wrapper}>
      <View style={macroStyles.ringWrap}>
        <Svg width={size} height={size}>
          <Circle
            stroke={Palette.border}
            fill="none"
            cx={center}
            cy={center}
            r={radius}
            strokeWidth={strokeWidth}
          />
          <Circle
            stroke={color}
            fill="none"
            cx={center}
            cy={center}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
          />
        </Svg>
        <Text style={macroStyles.value}>{consumed}g</Text>
      </View>
      <Text style={macroStyles.label}>{label}</Text>
      <Text style={macroStyles.target}>{target}g goal</Text>
    </View>
  );
}

const macroStyles = StyleSheet.create({
  wrapper: { alignItems: "center", flex: 1 },
  ringWrap: { justifyContent: "center", alignItems: "center" },
  value: {
    position: "absolute",
    fontSize: 14,
    fontWeight: "800",
    color: Palette.textPrimary,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: Palette.textSecondary,
    marginTop: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  target: {
    fontSize: 10,
    color: Palette.textMuted,
    marginTop: 2,
  },
});

// ── Calorie Summary Ring ────────────────────────────────────
function CalorieRing({
  consumed,
  target,
}: {
  consumed: number;
  target: number;
}) {
  const size = 140;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(consumed / target, 1);
  const center = size / 2;
  const remaining = Math.max(target - consumed, 0);

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="calGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={Palette.success} />
            <Stop offset="100%" stopColor="#10B981" />
          </LinearGradient>
        </Defs>
        <Circle
          stroke={Palette.border}
          fill="none"
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke="url(#calGrad)"
          fill="none"
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 28, fontWeight: "800", color: Palette.textPrimary }}>
          {remaining}
        </Text>
        <Text style={{ fontSize: 11, color: Palette.textMuted, textTransform: "uppercase", letterSpacing: 0.8 }}>
          cal left
        </Text>
      </View>
    </View>
  );
}

// ── Meal Card ───────────────────────────────────────────────
function MealCard({
  icon,
  title,
  calories,
  items,
  onAdd,
}: {
  icon: string;
  title: string;
  calories: number;
  items: string[];
  onAdd: () => void;
}) {
  return (
    <View style={mealStyles.card}>
      <View style={mealStyles.row}>
        <View style={mealStyles.iconWrap}>
          <Text style={mealStyles.icon}>{icon}</Text>
        </View>
        <View style={mealStyles.info}>
          <Text style={mealStyles.title}>{title}</Text>
          <Text style={mealStyles.cal}>{calories} cal</Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            mealStyles.addBtn,
            pressed && { opacity: 0.7 },
          ]}
          onPress={onAdd}
        >
          <Text style={mealStyles.addText}>+</Text>
        </Pressable>
      </View>
      {items.length > 0 && (
        <View style={mealStyles.itemsList}>
          {items.map((item, idx) => (
            <Text key={idx} style={mealStyles.itemText}>
              • {item}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const mealStyles = StyleSheet.create({
  card: {
    backgroundColor: Palette.bgCard,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Palette.accentMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 22 },
  info: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: Palette.textPrimary,
  },
  cal: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  addText: {
    color: Palette.white,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 22,
  },
  itemsList: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
  },
  itemText: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginBottom: 4,
  },
});

// ── Water Tracker ───────────────────────────────────────────
function WaterTracker({
  glasses,
  goal,
  onAdd,
}: {
  glasses: number;
  goal: number;
  onAdd: () => void;
}) {
  return (
    <View style={waterStyles.card}>
      <View style={waterStyles.row}>
        <Text style={waterStyles.icon}>💧</Text>
        <View style={waterStyles.info}>
          <Text style={waterStyles.title}>Water Intake</Text>
          <Text style={waterStyles.sub}>
            {glasses} / {goal} glasses
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            waterStyles.addBtn,
            pressed && { opacity: 0.7 },
          ]}
          onPress={onAdd}
        >
          <Text style={waterStyles.addText}>+1</Text>
        </Pressable>
      </View>
      <View style={waterStyles.glassRow}>
        {Array.from({ length: goal }).map((_, i) => (
          <View
            key={i}
            style={[
              waterStyles.glass,
              i < glasses && waterStyles.glassFilled,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const waterStyles = StyleSheet.create({
  card: {
    backgroundColor: Palette.bgCard,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: { fontSize: 26, marginRight: Spacing.md },
  info: { flex: 1 },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: Palette.textPrimary,
  },
  sub: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  addBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radii.sm,
    backgroundColor: Palette.info + "20",
  },
  addText: {
    color: Palette.info,
    fontWeight: "700",
    fontSize: 14,
  },
  glassRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: Spacing.md,
  },
  glass: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.border,
  },
  glassFilled: {
    backgroundColor: Palette.info,
  },
});

// ── Main Screen ─────────────────────────────────────────────
export default function NutritionScreen() {
  const [waterGlasses, setWaterGlasses] = useState(3);

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Page header */}
        <Text style={styles.pageTitle}>Nutrition</Text>
        <Text style={styles.pageSub}>Track your meals & macros</Text>

        {/* Calorie Ring */}
        <View style={styles.calSection}>
          <CalorieRing consumed={1240} target={2200} />
          <View style={styles.calStats}>
            <View style={styles.calStat}>
              <Text style={styles.calStatVal}>1,240</Text>
              <Text style={styles.calStatLabel}>Eaten</Text>
            </View>
            <View style={styles.calStatDivider} />
            <View style={styles.calStat}>
              <Text style={styles.calStatVal}>320</Text>
              <Text style={styles.calStatLabel}>Burned</Text>
            </View>
          </View>
        </View>

        {/* Macros */}
        <View style={styles.macroSection}>
          <Text style={styles.sectionTitle}>Macros</Text>
          <View style={styles.macroRow}>
            <MacroRing
              consumed={85}
              target={180}
              label="Protein"
              color="#EF4444"
            />
            <MacroRing
              consumed={120}
              target={250}
              label="Carbs"
              color="#FBBF24"
            />
            <MacroRing
              consumed={45}
              target={70}
              label="Fat"
              color="#38BDF8"
            />
          </View>
        </View>

        {/* Meals */}
        <Text style={styles.sectionTitle}>Today's Meals</Text>
        <MealCard
          icon="🌅"
          title="Breakfast"
          calories={420}
          items={["Oatmeal with berries", "2 eggs scrambled"]}
          onAdd={() => {}}
        />
        <MealCard
          icon="☀️"
          title="Lunch"
          calories={620}
          items={["Grilled chicken salad"]}
          onAdd={() => {}}
        />
        <MealCard
          icon="🌙"
          title="Dinner"
          calories={200}
          items={[]}
          onAdd={() => {}}
        />
        <MealCard
          icon="🍎"
          title="Snacks"
          calories={0}
          items={[]}
          onAdd={() => {}}
        />

        {/* Water */}
        <WaterTracker
          glasses={waterGlasses}
          goal={8}
          onAdd={() => setWaterGlasses((g) => Math.min(g + 1, 8))}
        />

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Palette.bg,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: Palette.textPrimary,
    letterSpacing: -0.5,
  },
  pageSub: {
    fontSize: 14,
    color: Palette.textSecondary,
    marginTop: 4,
    marginBottom: Spacing.xl,
  },
  calSection: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  calStats: {
    flexDirection: "row",
    gap: Spacing["2xl"],
    marginTop: Spacing.lg,
    alignItems: "center",
  },
  calStat: { alignItems: "center" },
  calStatVal: {
    fontSize: 20,
    fontWeight: "800",
    color: Palette.textPrimary,
  },
  calStatLabel: {
    fontSize: 11,
    color: Palette.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  calStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: Palette.border,
  },
  macroSection: {
    marginBottom: Spacing.xl,
  },
  macroRow: {
    flexDirection: "row",
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Palette.textPrimary,
    marginBottom: Spacing.md,
  },
});
