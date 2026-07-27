import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  TextStyle,
  Linking,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome5 } from "@expo/vector-icons";

import { fetchCollectionProducts, ShopifyProduct } from "@/utils/shopify";

const ACCENT       = "#aa33ff";
const ACCENT_DIM   = "#330066";
const ACCENT_DARK  = "#0e0018";
const BG           = "#0a0014";

const COLLECTION_HANDLE = "new-movie-opportunities";
const PAGE_SIZE = 20;

export default function FilmOppsScreen() {
  const insets = useSafeAreaInsets();
  const [products, setProducts]       = useState<ShopifyProduct[]>([]);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const cursorRef   = useRef<string | null>(null);
  const hasMoreRef  = useRef(true);
  const fetchingRef = useRef(false);

  useEffect(() => {
    fetchCollectionProducts(COLLECTION_HANDLE, PAGE_SIZE).then((page) => {
      setProducts(page.products);
      cursorRef.current  = page.endCursor;
      hasMoreRef.current = page.hasNextPage;
      setLoading(false);
    });
  }, []);

  const loadMore = useCallback(async () => {
    if (fetchingRef.current || !hasMoreRef.current) return;
    fetchingRef.current = true;
    setLoadingMore(true);
    const page = await fetchCollectionProducts(COLLECTION_HANDLE, PAGE_SIZE, cursorRef.current ?? undefined);
    setProducts((prev) => [...prev, ...page.products]);
    cursorRef.current  = page.endCursor;
    hasMoreRef.current = page.hasNextPage;
    fetchingRef.current = false;
    setLoadingMore(false);
  }, []);

  const onScroll = useCallback(
    ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
      if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 200) loadMore();
    },
    [loadMore],
  );

  const openURL = (url: string) => Linking.openURL(url).catch(() => {});

  return (
    <View style={[styles.root, { paddingTop: insets.top || 16, paddingBottom: insets.bottom || 16 }]}>

      <Pressable style={styles.backBtn} onPress={() => router.replace("/hub")}>
        <FontAwesome5 name="arrow-left" size={16} color="#ffffff" />
        <Text style={styles.backText}>BACK</Text>
      </Pressable>

      <Text style={[styles.pageTitle, titleGlow]}>🎬 NEW FILM EXCLUSIVES</Text>
      <Text style={styles.pageSubtitle}>NEW MOVIE OPPORTUNITIES</Text>

      <View style={styles.noticeBanner}>
        <FontAwesome5 name="film" size={11} color={ACCENT} solid />
        <Text style={styles.noticeText}>
          Items are fulfilled securely through our Shopify store.
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.grid}
        onScroll={onScroll}
        scrollEventThrottle={200}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={ACCENT} size="large" />
            <Text style={styles.loadingText}>LOADING…</Text>
          </View>
        ) : products.length === 0 ? (
          <View style={styles.loadingWrap}>
            <FontAwesome5 name="film" size={32} color={ACCENT_DIM} />
            <Text style={styles.loadingText}>NOTHING HERE YET</Text>
          </View>
        ) : (
          products.map((product) => (
            <Pressable
              key={product.id}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => openURL(product.url)}
            >
              {product.compareAtPrice && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>SALE</Text>
                </View>
              )}

              <ExpoImage
                source={{ uri: product.imageUrl ?? undefined }}
                contentFit="cover"
                style={styles.productImage}
              />

              <Text style={styles.productType}>{product.productType}</Text>
              <Text style={styles.productTitle} numberOfLines={2}>{product.title}</Text>

              <View style={styles.priceRow}>
                <Text style={styles.productPrice}>{product.price}</Text>
                {product.compareAtPrice && (
                  <Text style={styles.originalPrice}>{product.compareAtPrice}</Text>
                )}
              </View>

              <View style={styles.viewBtn}>
                <Text style={styles.viewBtnText}>VIEW DETAILS</Text>
                <FontAwesome5 name="external-link-alt" size={9} color={ACCENT_DARK} />
              </View>
            </Pressable>
          ))
        )}

        {loadingMore && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={ACCENT} size="small" />
          </View>
        )}
      </ScrollView>

    </View>
  );
}

const titleGlow: TextStyle =
  Platform.OS === "web"
    ? // @ts-expect-error
      { textShadow: `0 0 16px ${ACCENT}, 0 0 30px #220044` }
    : { textShadowColor: ACCENT, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16 };

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    marginBottom: 8,
    paddingVertical: 10,
    paddingRight: 20,
  },
  backText: { fontSize: 13, color: "#ffffff", fontFamily: "Inter_700Bold", letterSpacing: 2 },

  pageTitle:    { fontSize: 20, color: ACCENT, fontFamily: "Inter_700Bold", letterSpacing: 2, textAlign: "center", marginBottom: 2 },
  pageSubtitle: { fontSize: 9, color: ACCENT_DIM, fontFamily: "Inter_700Bold", letterSpacing: 3, marginBottom: 10 },

  noticeBanner: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "rgba(80,0,140,0.2)",
    borderWidth: 1,
    borderColor: ACCENT_DIM,
    borderRadius: 8,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  noticeText: { flex: 1, fontSize: 10, color: "#7744aa", fontFamily: "Inter_400Regular", lineHeight: 14 },

  scroll: { flex: 1, width: "100%" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
    maxWidth: 440,
    alignSelf: "center",
    paddingBottom: 16,
  },

  loadingWrap: { width: "100%", alignItems: "center", paddingVertical: 48, gap: 12 },
  loadingText: { fontSize: 10, color: ACCENT_DIM, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },

  card: {
    width: "47%",
    minWidth: 148,
    backgroundColor: "rgba(60,0,100,0.3)",
    borderWidth: 1.5,
    borderColor: ACCENT_DIM,
    borderRadius: 12,
    padding: 12,
    alignItems: "flex-start",
    gap: 5,
    position: "relative",
  },
  cardPressed: { opacity: 0.75 },

  badge: {
    position: "absolute", top: 8, right: 8, zIndex: 1,
    backgroundColor: "rgba(170,51,255,0.2)",
    borderWidth: 1, borderColor: ACCENT, borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  badgeText: { fontSize: 7, color: ACCENT, fontFamily: "Inter_700Bold", letterSpacing: 1 },

  productImage: {
    width: "100%", height: 120, borderRadius: 8,
    backgroundColor: "rgba(40,0,70,0.8)", marginBottom: 4,
  },
  productType:  { fontSize: 7, color: "#6622aa", fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  productTitle: { fontSize: 11, color: "#ddaaff", fontFamily: "Inter_700Bold", lineHeight: 15 },

  priceRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  productPrice:  { fontSize: 14, color: ACCENT, fontFamily: "Inter_700Bold" },
  originalPrice: { fontSize: 10, color: "#886699", fontFamily: "Inter_400Regular", textDecorationLine: "line-through" },

  viewBtn: {
    width: "100%",
    backgroundColor: ACCENT,
    borderRadius: 4, paddingVertical: 7,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, marginTop: 4,
  },
  viewBtnText: { color: ACCENT_DARK, fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },

});
