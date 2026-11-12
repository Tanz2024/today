"use client";
import { useEffect } from "react";
import { rememberRecentArticle } from "@/lib/recently-read";
export default function RecentReadTracker({ slug }: { slug: string }) { useEffect(() => { rememberRecentArticle(slug, window.localStorage); }, [slug]); return null; }
