import React, { useEffect, useState } from "react";
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
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome5 } from "@expo/vector-icons";

import { fetchCollectionProducts, ShopifyProduct } from "@/utils/shopify";

const SHOPIFY_STORE_URL = "https://returnofthelivingdead.com/collections/all-products-1";
const COLLECTION_HANDLE = "more-brains-app";

export default function StoreScreen() {
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetchCollectionProducts(COLLECTION_HANDLE).then((p) => {
      setProducts(p);
      setLoading(false);
    });
  }, []);

  const openURL = (url: string) => Linking.openURL(url).catch(() => {});

  return (
    <View style={[styles.root, { paddingTop: insets.top || 16, paddingBottom: insets.bottom || 16 }]}>

      {/* Back */}
      <Pressable style={styles.backBtn} onPress={() => router.replace("/hub")}>
        <FontAwesome5 name="arrow-left" size={12} color="#ffffff" />
        <Text style={styles.backText}>BACK</Text>
      </Pressable>

      {/* Page title */}
      <Text style={[styles.pageTitle, titleGlow]}>🛒 OFFICIAL STORE</Text>
      <Text style={styles.pageSubtitle}>RTLD MERCH & COLLECTIBLES</Text>

      {/* Checkout notice */}
      <View style={styles.noticeBanner}>
        <FontAwesome5 name="store" size={11} color="#00ff88" solid />
        <Text style={styles.noticeText}>
          Purchases are completed securely on our Shopify store.
        </Text>
      </View>

      {/* Product grid */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.grid}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color="#00ff88" size="large" />
            <Text style={styles.loadingText}>LOADING PRODUCTS…</Text>
          </View>
        ) : products.length === 0 ? (
          <View style={styles.loadingWrap}>
            <FontAwesome5 name="store-slash" size={32} color="#224433" />
            <Text style={styles.loadingText}>NO PRODUCTS AVAILABLE</Text>
          </View>
        ) : (
          products.map((product) => (
            <Pressable
              key={product.id}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => openURL(product.url)}
            >
              {/* Sale badge */}
              {product.compareAtPrice && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>SALE</Text>
                </View>
              )}

              {/* Product image */}
              <ExpoImage
                source={{ uri: product.imageUrl ?? undefined }}
                contentFit="cover"
                style={styles.productImage}
              />

              {/* Info */}
              <Text style={styles.productType}>{product.productType}</Text>
              <Text style={styles.productTitle} numberOfLines={2}>{product.title}</Text>

              {/* Price row */}
              <View style={styles.priceRow}>
                <Text style={styles.productPrice}>{product.price}</Text>
                {product.compareAtPrice && (
                  <Text style={styles.originalPrice}>{product.compareAtPrice}</Text>
                )}
              </View>

              {/* CTA */}
              <View style={styles.buyBtn}>
                <Text style={styles.buyBtnText}>VIEW IN STORE</Text>
                <FontAwesome5 name="external-link-alt" size={9} color="#0a0012" />
              </View>
            </Pressable>
          ))
        )}

        {/* Browse all */}
        {!loading && (
          <Pressable
            style={({ pressed }) => [styles.browseAllBtn, pressed && { opacity: 0.75 }]}
            onPress={() => openURL(SHOPIFY_STORE_URL)}
          >
            <FontAwesome5 name="shopping-bag" size={13} color="#0a0012" solid />
            <Text style={styles.browseAllText}>BROWSE ALL PRODUCTS</Text>
          </Pressable>
        )}
      </ScrollView>

    </View>
  );
}

const titleGlow: TextStyle =
  Platform.OS === "web"
    ? // @ts-expect-error
      { textShadow: "0 0 16px #00ff88, 0 0 30px #004422" }
    : { textShadowColor: "#00ff88", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16 };

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0a0012",
    alignItems: "center",
    paddingHorizontal: 16,
  },

  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginBottom: 8,
  },
  backText: {
    fontSize: 10,
    color: "#ffffff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },

  pageTitle: {
    fontSize: 22,
    color: "#00ff88",
    fontFamily: "Inter_700Bold",
    letterSpacing: 3,
    marginBottom: 2,
  },
  pageSubtitle: {
    fontSize: 9,
    color: "#004422",
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    marginBottom: 8,
  },

  noticeBanner: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "rgba(0,50,25,0.6)",
    borderWidth: 1,
    borderColor: "#004422",
    borderRadius: 8,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  noticeText: {
    flex: 1,
    fontSize: 10,
    color: "#336644",
    fontFamily: "Inter_400Regular",
    lineHeight: 14,
  },

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

  loadingWrap: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    fontSize: 10,
    color: "#224433",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },

  card: {
    width: "47%",
    minWidth: 148,
    backgroundColor: "rgba(0,40,20,0.5)",
    borderWidth: 1.5,
    borderColor: "#004422",
    borderRadius: 12,
    padding: 12,
    alignItems: "flex-start",
    gap: 5,
    position: "relative",
  },
  cardPressed: { opacity: 0.75 },

  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255,51,51,0.2)",
    borderWidth: 1,
    borderColor: "#ff3333",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    zIndex: 1,
  },
  badgeText: {
    fontSize: 7,
    color: "#ff3333",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },

  productImage: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    backgroundColor: "rgba(0,30,15,0.8)",
    marginBottom: 4,
  },

  productType: {
    fontSize: 7,
    color: "#006633",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  productTitle: {
    fontSize: 11,
    color: "#aaddcc",
    fontFamily: "Inter_700Bold",
    lineHeight: 15,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  productPrice: {
    fontSize: 14,
    color: "#00ff88",
    fontFamily: "Inter_700Bold",
  },
  originalPrice: {
    fontSize: 10,
    color: "#446655",
    fontFamily: "Inter_400Regular",
    textDecorationLine: "line-through",
  },

  buyBtn: {
    width: "100%",
    backgroundColor: "#00ff88",
    borderRadius: 4,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
  },
  buyBtnText: {
    color: "#0a0012",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },

  browseAllBtn: {
    width: "100%",
    maxWidth: 440,
    marginTop: 4,
    paddingVertical: 13,
    backgroundColor: "#00ff88",
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  browseAllText: {
    color: "#0a0012",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
});
