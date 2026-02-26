/**
 * Dashboard controller
 * Provides overview statistics and recent activity
 */

import type { Request, Response } from "express";
import { getTotalSessions, getAllSessionsWithMessages } from "./chat.db";
import { getAllMemories } from "../memory/memory.db";

export interface DashboardStats {
  memories: {
    total: number;
    byType: Record<string, number>;
    recent: Array<{
      id: string;
      filename: string;
      type?: string;
      preview: string;
      last_updated?: string;
    }>;
  };
  sessions: {
    total: number;
    all: Array<{
      conversation_id: string;
      message_count: number;
      last_message_at: string;
      recent_messages: Array<{
        role: string;
        content: string;
        created_at: string;
      }>;
    }>;
  };
}

export function dashboardController(req: Request, res: Response): void {
  try {
    // Get memory statistics
    const allMemories = getAllMemories();
    const totalMemories = allMemories.length;

    // Count memories by type
    const byType: Record<string, number> = {};
    for (const memory of allMemories) {
      const type = memory.type || "uncategorized";
      byType[type] = (byType[type] || 0) + 1;
    }

    // Get 5 most recent memories
    const recentMemories = allMemories
      .sort((a, b) => {
        const dateA = a.last_updated ? new Date(a.last_updated).getTime() : 0;
        const dateB = b.last_updated ? new Date(b.last_updated).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5)
      .map((m) => ({
        id: m.id,
        filename: m.filename,
        type: m.type,
        preview: m.preview || "",
        last_updated: m.last_updated,
      }));

    // Get session statistics
    const totalSessions = getTotalSessions();
    const allSessions = getAllSessionsWithMessages(10);

    const stats: DashboardStats = {
      memories: {
        total: totalMemories,
        byType,
        recent: recentMemories,
      },
      sessions: {
        total: totalSessions,
        all: allSessions.map((session) => ({
          conversation_id: session.conversation_id,
          message_count: session.message_count,
          last_message_at: session.last_message_at,
          recent_messages: session.messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
            created_at: msg.created_at,
          })),
        })),
      },
    };

    res.json(stats);
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({
      error: "Failed to fetch dashboard statistics",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
