// app/index.jsx - Complete Fixed Version with Full Header Coverage
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  Modal,
  FlatList,
  RefreshControl,
  Animated,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useObservations } from "./contexts/ObservationContext";
import { useAuth } from "./contexts/AuthContext";
import {
  useSafeAreaInsets,
  SafeAreaView,
} from "react-native-safe-area-context";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    observations,
    getPendingCount,
    isOnline,
    lastSyncTime,
    syncNow,
    markAsAttended,
  } = useObservations();
  const { user, logout } = useAuth();
  const [showHistory, setShowHistory] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const pendingCount = getPendingCount();

  const needsAttention = observations.filter(
    (obs) => obs.status !== "attended",
  );
  const attendedObservations = observations.filter(
    (obs) => obs.status === "attended",
  );
  const pendingSync = observations.filter((obs) => !obs.synced);

  const formatDate = (isoString) => {
    if (!isoString) return "Never";
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const formatLocation = (item) => {
    return item.locationName || item.location || "Location unknown";
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          const result = await logout();
          if (!result.success) Alert.alert("Error", result.error);
        },
      },
    ]);
  };

  // app/index.jsx - Update handleMarkAsAttended
  const handleMarkAsAttended = async (observationId, groupName) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Confirm Attendance", `Mark "${groupName}" as attended?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes, Mark",
        onPress: async () => {
          try {
            const result = await markAsAttended(observationId);
            if (result) {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              // Simple alert, not modal
              Alert.alert("Success", "Sighting marked as attended!");
              setShowPendingModal(false);
            } else {
              Alert.alert("Error", "Failed to mark as attended");
            }
          } catch (error) {
            console.log("Mark as attended error:", error);
            Alert.alert("Success", "Sighting marked as attended locally!");
            setShowPendingModal(false);
          }
        },
      },
    ]);
  };
  const onRefresh = async () => {
    setRefreshing(true);
    await syncNow();
    setRefreshing(false);
  };

  const features = [
    {
      id: "observations",
      title: "Sightings",
      description: "Track gorilla sightings",
      icon: "🦍",
      color: "#10B981",
      route: "/observations",
      iconBg: "#10B98115",
    },
    {
      id: "tracking",
      title: "Tracking",
      description: "Real-time location",
      icon: "🗺️",
      color: "#3B82F6",
      route: "/tracking",
      iconBg: "#3B82F615",
    },
    {
      id: "diagnostics",
      title: "System",
      description: "Hardware status",
      icon: "🔧",
      color: "#F59E0B",
      route: "/diagnostics",
      iconBg: "#F59E0B15",
    },
    {
      id: "alerts",
      title: "Chat",
      description: "Team chat",
      icon: "💬",
      color: "#8B5CF6",
      route: "/alerts",
      iconBg: "#8B5CF615",
    },
  ];

  // Render Functions
  const renderStatCard = (icon, value, label, color, onPress) => (
    <TouchableOpacity
      key={label}
      style={[styles.statCard, onPress && styles.statCardPressable]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[`${color}15`, `${color}08`]}
        style={styles.statCardGradient}
      >
        <View
          style={[styles.statIconCircle, { backgroundColor: `${color}20` }]}
        >
          <Text style={styles.statIcon}>{icon}</Text>
        </View>
        <Text style={[styles.statNumber, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
        {onPress && (
          <Ionicons
            name="chevron-forward"
            size={16}
            color={color}
            style={styles.statChevron}
          />
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderFeatureCard = (feature) => (
    <TouchableOpacity
      key={feature.id}
      style={styles.featureCard}
      onPress={() => router.push(feature.route)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[feature.iconBg, "white"]}
        style={styles.featureCardGradient}
      >
        <View
          style={[
            styles.featureIconCircle,
            { backgroundColor: feature.iconBg },
          ]}
        >
          <Text style={styles.featureIcon}>{feature.icon}</Text>
        </View>
        <Text style={styles.featureTitle}>{feature.title}</Text>
        <Text style={styles.featureDescription}>{feature.description}</Text>
        <View style={styles.featureArrow}>
          <Ionicons name="arrow-forward" size={16} color={feature.color} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderPreviewCard = (obs) => (
    <TouchableOpacity
      key={obs.id}
      style={styles.previewCard}
      onPress={() => handleMarkAsAttended(obs.id, obs.gorillaGroup)}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={["#fff", "#fef9e7"]}
        style={styles.previewCardGradient}
      >
        <View style={styles.previewIcon}>
          <Text style={styles.previewIconText}>🦍</Text>
        </View>
        <View style={styles.previewContent}>
          <Text style={styles.previewGroup} numberOfLines={1}>
            {obs.gorillaGroup}
          </Text>
          <Text style={styles.previewLocation} numberOfLines={1}>
            {formatLocation(obs)}
          </Text>
          <Text style={styles.previewTime}>{formatDate(obs.createdAt)}</Text>
        </View>
        <View style={styles.previewArrow}>
          <Ionicons name="chevron-forward" size={20} color="#F59E0B" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderAttendedCard = (obs) => (
    <View key={obs.id} style={styles.attendedCard}>
      <LinearGradient
        colors={["#f5f5f5", "#e8f5e9"]}
        style={styles.attendedCardGradient}
      >
        <View style={styles.attendedIconContainer}>
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
        </View>
        <View style={styles.attendedContent}>
          <Text style={styles.attendedGroup} numberOfLines={1}>
            {obs.gorillaGroup}
          </Text>
          <Text style={styles.attendedLocation} numberOfLines={1}>
            {formatLocation(obs)}
          </Text>
          <Text style={styles.attendedTime}>
            {formatDate(obs.attendedAt || obs.createdAt)}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );

  // Pending Modal Component
  const PendingModal = () => (
    <Modal
      visible={showPendingModal}
      animationType="slide"
      onRequestClose={() => setShowPendingModal(false)}
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer} edges={["bottom"]}>
        <LinearGradient
          colors={["#1a1a2e", "#16213e"]}
          style={styles.modalHeader}
        >
          <View>
            <Text style={styles.modalTitle}>Pending Sightings</Text>
            <Text style={styles.modalSubtitle}>
              {needsAttention.length} sightings need attention
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowPendingModal(false)}
            style={styles.modalCloseButton}
          >
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
        </LinearGradient>

        <FlatList
          data={needsAttention}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.pendingCard}>
              <LinearGradient
                colors={["#fff", "#fef9e7"]}
                style={styles.pendingCardGradient}
              >
                <View style={styles.pendingCardHeader}>
                  <View style={styles.pendingIconContainer}>
                    <Text style={styles.pendingIcon}>🦍</Text>
                  </View>
                  <View style={styles.pendingContent}>
                    <Text style={styles.pendingGroup}>{item.gorillaGroup}</Text>
                    <Text style={styles.pendingLocation}>
                      {formatLocation(item)}
                    </Text>
                    <Text style={styles.pendingUser}>
                      {item.userName || "Anonymous"}
                    </Text>
                  </View>
                  <View style={styles.pendingTimeBadge}>
                    <Text style={styles.pendingTimeText}>
                      {formatDate(item.createdAt)}
                    </Text>
                  </View>
                </View>
                <View style={styles.pendingHealthRow}>
                  <View style={styles.pendingHealthBadge}>
                    <FontAwesome5 name="heartbeat" size={12} color="#F59E0B" />
                    <Text style={styles.pendingHealthText}>
                      {item.healthStatus || "Health unknown"}
                    </Text>
                  </View>
                </View>
                {item.notes ? (
                  <View style={styles.pendingNotes}>
                    <Ionicons
                      name="document-text-outline"
                      size={14}
                      color="#666"
                    />
                    <Text style={styles.pendingNotesText}>{item.notes}</Text>
                  </View>
                ) : null}
                <TouchableOpacity
                  style={styles.modalAttendButton}
                  onPress={() =>
                    handleMarkAsAttended(item.id, item.gorillaGroup)
                  }
                >
                  <LinearGradient
                    colors={["#10B981", "#059669"]}
                    style={styles.modalAttendGradient}
                  >
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={20}
                      color="white"
                    />
                    <Text style={styles.modalAttendText}>Mark as Attended</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          )}
          contentContainerStyle={styles.pendingList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyPending}>
              <Ionicons
                name="checkmark-done-circle"
                size={80}
                color="#10B981"
              />
              <Text style={styles.emptyPendingText}>All Clear!</Text>
              <Text style={styles.emptyPendingSubtext}>
                No pending sightings to attend to
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );

  // History Modal Component
  const HistoryModal = () => (
    <Modal
      visible={showHistory}
      animationType="slide"
      onRequestClose={() => setShowHistory(false)}
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer} edges={["bottom"]}>
        <LinearGradient
          colors={["#1a1a2e", "#16213e"]}
          style={styles.modalHeader}
        >
          <View>
            <Text style={styles.modalTitle}>Attended History</Text>
            <Text style={styles.modalSubtitle}>
              {attendedObservations.length} sightings attended
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowHistory(false)}
            style={styles.modalCloseButton}
          >
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
        </LinearGradient>

        <FlatList
          data={attendedObservations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.historyItem}>
              <LinearGradient
                colors={["#fff", "#f0fdf4"]}
                style={styles.historyItemGradient}
              >
                <View style={styles.historyIcon}>
                  <Text style={styles.historyIconText}>🦍</Text>
                </View>
                <View style={styles.historyContent}>
                  <Text style={styles.historyGroup}>{item.gorillaGroup}</Text>
                  <Text style={styles.historyLocation}>
                    {formatLocation(item)}
                  </Text>
                  <Text style={styles.historyInfo}>
                    Attended by {item.attendedByName || "Team"} •{" "}
                    {item.attendedAt
                      ? new Date(item.attendedAt).toLocaleDateString()
                      : "Recently"}
                  </Text>
                </View>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              </LinearGradient>
            </View>
          )}
          contentContainerStyle={styles.historyList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyHistory}>
              <Ionicons name="checkmark-done-circle" size={80} color="#10B981" />
              <Text style={styles.emptyHistoryText}>No Attended Sightings Yet</Text>
              <Text style={styles.emptyHistorySubtext}>Mark sightings as attended to see them here</Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <LinearGradient
        colors={["#1a1a2e", "#16213e", "#0f3460"]}
        style={[styles.headerGradient, { paddingTop: insets.top + 10 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerUser}>
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={["#10B981", "#059669"]}
                style={styles.avatarGradient}
              >
                <Text style={styles.avatarText}>
                  {user?.displayName?.charAt(0) ||
                    user?.email?.charAt(0) ||
                    "U"}
                </Text>
              </LinearGradient>
              <View style={styles.onlineDot} />
            </View>
            <View>
              <Text style={styles.welcomeText}>Welcome back</Text>
              <Text style={styles.userName}>
                {user?.displayName || user?.email?.split("@")[0] || "Ranger"}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={20} color="white" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerStats}>
          <View style={styles.headerStat}>
            <Text style={styles.headerStatNumber}>{observations.length}</Text>
            <Text style={styles.headerStatLabel}>Total Sightings</Text>
          </View>
          <View style={styles.headerDivider} />
          <View style={styles.headerStat}>
            <Text style={styles.headerStatNumber}>{pendingSync.length}</Text>
            <Text style={styles.headerStatLabel}>Pending Sync</Text>
          </View>
          <View style={styles.headerDivider} />
          <View style={styles.headerStat}>
            <View style={styles.onlineIndicator}>
              <View
                style={[styles.onlineDotSmall, isOnline && styles.onlineActive]}
              />
              <Text style={styles.headerStatLabel}>
                {isOnline ? "Online" : "Offline"}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <Animated.ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#10B981"]}
            tintColor="#10B981"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {renderStatCard(
            "⚠️",
            needsAttention.length,
            "Attention",
            "#F59E0B",
            () => setShowPendingModal(true),
          )}
          {renderStatCard(
            "✅",
            attendedObservations.length,
            "Attended",
            "#10B981",
            () => setShowHistory(true),
          )}
          {renderStatCard("🔄", pendingSync.length, "Pending Sync", "#3B82F6")}
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <Text style={styles.sectionTitle}>Core Features</Text>
          <View style={styles.featuresGrid}>
            {features.map((feature) => renderFeatureCard(feature))}
          </View>
        </View>

        {/* Pending Sightings Preview */}
        <View style={styles.pendingSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="alert-circle" size={20} color="#F59E0B" /> Pending
              Sightings
            </Text>
            {needsAttention.length > 2 && (
              <TouchableOpacity onPress={() => setShowPendingModal(true)}>
                <Text style={styles.seeAllText}>
                  See All {needsAttention.length}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {needsAttention.length === 0 ? (
            <LinearGradient
              colors={["#f0fdf4", "#dcfce7"]}
              style={styles.emptyStateCard}
            >
              <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              <Text style={styles.emptyStateText}>All clear!</Text>
              <Text style={styles.emptyStateSubtext}>
                No pending sightings to attend to
              </Text>
            </LinearGradient>
          ) : (
            needsAttention.slice(0, 2).map((obs) => renderPreviewCard(obs))
          )}
        </View>

        {/* Recent Attended */}
        {attendedObservations.length > 0 && (
          <View style={styles.attendedSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />{" "}
                Recently Attended
              </Text>
              {attendedObservations.length > 2 && (
                <TouchableOpacity onPress={() => setShowHistory(true)}>
                  <Text style={styles.seeAllText}>View All</Text>
                </TouchableOpacity>
              )}
            </View>
            {attendedObservations
              .slice(0, 2)
              .map((obs) => renderAttendedCard(obs))}
          </View>
        )}

        {/* Footer */}
        <LinearGradient colors={["#1a1a2e", "#16213e"]} style={styles.footer}>
          <Text style={styles.footerTitle}>SilverBack Sentry</Text>
          <Text style={styles.footerText}>
            Protecting gorillas through technology
          </Text>
          <View style={styles.footerBadge}>
            <Text style={styles.footerBadgeText}>v1.0.0</Text>
          </View>
        </LinearGradient>
      </Animated.ScrollView>

      <PendingModal />
      <HistoryModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContainer: {
    paddingBottom: 20,
    backgroundColor: "#f5f5f5",
  },

  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  headerUser: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatarContainer: { position: "relative", marginRight: 12 },
  avatarGradient: {
    width: 55,
    height: 55,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#1a1a2e",
  },
  welcomeText: { fontSize: 14, color: "rgba(255,255,255,0.7)" },
  userName: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  logoutText: { color: "white", fontSize: 14, fontWeight: "500" },
  headerStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    padding: 15,
  },
  headerStat: { alignItems: "center", flex: 1 },
  headerStatNumber: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  headerStatLabel: { fontSize: 11, color: "rgba(255,255,255,0.7)" },
  headerDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  onlineIndicator: { flexDirection: "row", alignItems: "center", gap: 6 },
  onlineDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#666",
  },
  onlineActive: {
    backgroundColor: "#10B981",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },

  statsGrid: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statCardPressable: { cursor: "pointer" },
  statCardGradient: { padding: 14, alignItems: "center", position: "relative" },
  statIconCircle: {
    width: 45,
    height: 45,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statIcon: { fontSize: 24 },
  statNumber: { fontSize: 22, fontWeight: "bold", marginBottom: 2 },
  statLabel: { fontSize: 11, color: "#666", textAlign: "center" },
  statChevron: { position: "absolute", bottom: 12, right: 12 },

  featuresContainer: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a1a2e",
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  seeAllText: { color: "#10B981", fontSize: 13, fontWeight: "500" },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  featureCard: {
    width: "48%",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 3,
  },
  featureCardGradient: { padding: 16, alignItems: "center" },
  featureIconCircle: {
    width: 55,
    height: 55,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  featureIcon: { fontSize: 28 },
  featureTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1a1a2e",
    marginBottom: 4,
  },
  featureDescription: { fontSize: 11, color: "#666", textAlign: "center" },
  featureArrow: { position: "absolute", bottom: 12, right: 12 },

  pendingSection: { paddingHorizontal: 16, marginTop: 20 },
  emptyStateCard: {
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
    gap: 8,
  },
  emptyStateText: { fontSize: 16, fontWeight: "bold", color: "#1a1a2e" },
  emptyStateSubtext: { fontSize: 13, color: "#666", textAlign: "center" },
  previewCard: { borderRadius: 12, overflow: "hidden", marginBottom: 10 },
  previewCardGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  previewIcon: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: "#fef3c7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  previewIconText: { fontSize: 24 },
  previewContent: { flex: 1 },
  previewGroup: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1a1a2e",
    marginBottom: 2,
  },
  previewLocation: { fontSize: 12, color: "#666", marginBottom: 2 },
  previewTime: { fontSize: 11, color: "#999" },
  previewArrow: { padding: 8 },

  attendedSection: { paddingHorizontal: 16, marginTop: 20 },
  attendedCard: { borderRadius: 12, overflow: "hidden", marginBottom: 10 },
  attendedCardGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  attendedIconContainer: { marginRight: 12 },
  attendedContent: { flex: 1 },
  attendedGroup: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1a1a2e",
    marginBottom: 2,
  },
  attendedLocation: { fontSize: 12, color: "#666", marginBottom: 2 },
  attendedTime: { fontSize: 11, color: "#999" },

  footer: {
    marginTop: 30,
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    gap: 8,
  },
  footerTitle: { fontSize: 16, fontWeight: "bold", color: "#fff" },
  footerText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
  },
  footerBadge: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  footerBadgeText: { fontSize: 10, color: "rgba(255,255,255,0.6)" },

  modalContainer: { flex: 1, backgroundColor: "#f5f5f5" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  modalTitle: { fontSize: 24, fontWeight: "bold", color: "white" },
  modalSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 4 },
  modalCloseButton: { padding: 5 },
  pendingList: { padding: 16, paddingBottom: 30 },
  pendingCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    elevation: 3,
    backgroundColor: "#fff",
  },
  pendingCardGradient: { padding: 16 },
  pendingCardHeader: { flexDirection: "row", marginBottom: 12 },
  pendingIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#fef3c7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  pendingIcon: { fontSize: 28 },
  pendingContent: { flex: 1 },
  pendingGroup: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1a1a2e",
    marginBottom: 4,
  },
  pendingLocation: { fontSize: 13, color: "#555", marginBottom: 2 },
  pendingUser: { fontSize: 12, color: "#666" },
  pendingTimeBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  pendingTimeText: { fontSize: 10, color: "#F59E0B", fontWeight: "500" },
  pendingHealthRow: { marginBottom: 12 },
  pendingHealthBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  pendingHealthText: { fontSize: 13, color: "#F59E0B", fontWeight: "500" },
  pendingNotes: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 16,
  },
  pendingNotesText: { fontSize: 13, color: "#666", flex: 1, lineHeight: 18 },
  modalAttendButton: { borderRadius: 12, overflow: "hidden", marginTop: 8 },
  modalAttendGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  modalAttendText: { color: "white", fontSize: 16, fontWeight: "bold" },
  emptyPending: { alignItems: "center", paddingTop: 60 },
  emptyPendingText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a1a2e",
    marginTop: 16,
  },
  emptyPendingSubtext: { fontSize: 14, color: "#666", marginTop: 8 },

  historyList: { padding: 16, paddingBottom: 30 },
  historyItem: { borderRadius: 14, overflow: "hidden", marginBottom: 12 },
  historyItemGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  historyIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#e8f5e9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  historyIconText: { fontSize: 26 },
  historyContent: { flex: 1 },
  historyGroup: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1a1a2e",
    marginBottom: 4,
  },
  historyLocation: { fontSize: 13, color: "#555", marginBottom: 2 },
  historyInfo: { fontSize: 12, color: "#666", marginTop: 2 },
  emptyHistory: { alignItems: "center", paddingTop: 80 },
  emptyHistoryText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a1a2e",
    marginTop: 16,
  },
  emptyHistorySubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
});
