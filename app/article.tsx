import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome5 } from "@expo/vector-icons";

import { getArticleById } from "@/utils/articleStore";

const ARTICLE_CSS = `
  body {
    margin: 0; padding: 16px;
    background: #050005;
    color: #ccffcc;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 15px;
    line-height: 1.7;
  }
  h1, h2, h3 { color: #39ff14; font-weight: 700; margin-top: 24px; }
  p  { margin: 12px 0; }
  a  { color: #39ff14; }
  img { max-width: 100%; border-radius: 8px; margin: 12px 0; }
  blockquote {
    border-left: 3px solid #39ff14;
    margin: 16px 0; padding: 8px 16px;
    color: #7aaa66;
    font-style: italic;
  }
  ul, ol { padding-left: 20px; }
  li { margin: 6px 0; }
  hr { border: none; border-top: 1px solid #1a2200; margin: 20px 0; }
`;

function buildHtmlPage(contentHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
  <style>${ARTICLE_CSS}</style>
</head>
<body>${contentHtml}</body>
</html>`;
}

export default function ArticleScreen() {
  const insets  = useSafeAreaInsets();
  const { id }  = useLocalSearchParams<{ id: string }>();
  const article = id ? getArticleById(id) : null;

  if (!article) {
    return (
      <View style={[styles.root, { paddingTop: insets.top || 16 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <FontAwesome5 name="arrow-left" size={12} color="#ffffff" />
          <Text style={styles.backText}>BACK</Text>
        </Pressable>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Article not found.</Text>
        </View>
      </View>
    );
  }

  const htmlPage = buildHtmlPage(article.contentHtml);

  return (
    <View style={[styles.root, { paddingTop: insets.top || 16, paddingBottom: insets.bottom || 16 }]}>
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <FontAwesome5 name="arrow-left" size={12} color="#ffffff" />
        <Text style={styles.backText}>ALL POSTS</Text>
      </Pressable>

      <Text style={styles.articleTitle} numberOfLines={3}>{article.title}</Text>

      <View style={styles.divider} />

      {Platform.OS === "web" ? (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* @ts-expect-error — dangerouslySetInnerHTML is web-only */}
          <div
            dangerouslySetInnerHTML={{ __html: article.contentHtml }}
            style={{
              color: "#ccffcc",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              fontSize: 15,
              lineHeight: "1.7",
              paddingBottom: 32,
            }}
          />
        </ScrollView>
      ) : (
        (() => {
          const { WebView } = require("react-native-webview");
          return (
            <WebView
              originWhitelist={["*"]}
              source={{ html: htmlPage }}
              style={styles.webview}
              showsVerticalScrollIndicator={false}
            />
          );
        })()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#050005",
    paddingHorizontal: 16,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginBottom: 12,
  },
  backText: {
    fontSize: 10,
    color: "#ffffff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  articleTitle: {
    fontSize: 20,
    color: "#39ff14",
    fontFamily: "Inter_700Bold",
    lineHeight: 27,
    marginBottom: 10,
    maxWidth: 440,
  },
  divider: {
    width: "100%",
    maxWidth: 440,
    height: 1,
    backgroundColor: "#1a2200",
    marginBottom: 12,
  },
  scroll: {
    flex: 1,
    maxWidth: 440,
    width: "100%",
    alignSelf: "center",
  },
  webview: {
    flex: 1,
    backgroundColor: "#050005",
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  notFoundText: {
    color: "#446633",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
});
