"use client";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useUnreadMessages(userId: string, classeIds: string[]) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId || classeIds.length === 0) return;

    const q = query(
      collection(db, "messages"),
      where("read", "==", false)
    );

    const unsub = onSnapshot(q, (snap) => {
      const count = snap.docs.filter(d => {
        const data = d.data();
        return (
          data.senderId !== userId &&
          classeIds.includes(data.classeId)
        );
      }).length;
      setUnreadCount(count);
    });

    return () => unsub();
  }, [userId, classeIds.join(",")]);

  return unreadCount;
}
