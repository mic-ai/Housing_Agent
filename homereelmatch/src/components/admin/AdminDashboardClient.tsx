"use client";

import { useState } from "react";
import { SalespersonManagerClient } from "./SalespersonManagerClient";
import { HouseMakerManagerClient } from "./HouseMakerManagerClient";
import { VenueManagerClient } from "./VenueManagerClient";
import { AssignmentManagerClient } from "./AssignmentManagerClient";
import { VideoManagerClient } from "./VideoManagerClient";
import { LearningContentManagerClient } from "./LearningContentManagerClient";

interface FaceVideo {
  id: string;
  rollType: "pre" | "post";
  publicUrl: string;
  durationSec: number;
}

interface Salesperson {
  id: string;
  name: string;
  company: { name: string };
  faceVideos: FaceVideo[];
}

interface Video {
  id: string;
  platform: "YOUTUBE" | "INSTAGRAM";
  url: string;
  title: string;
  thumbnailUrl: string | null;
  hashtags: string[];
  isActive: boolean;
}

interface Assignment {
  id: string;
  isPrimary: boolean;
  preRollPublicUrl: string | null;
  postRollPublicUrl: string | null;
  salesperson: Salesperson;
  video: Video;
}

interface AdminDashboardClientProps {
  initialAssignments: Assignment[];
  salespersons: Omit<Salesperson, "faceVideos">[];
  activeVideos: Video[];
  initialHouseMakers: { id: string; name: string }[];
}

type Tab = "salesperson" | "housemaker" | "venue" | "assignment" | "video" | "learning";

const TABS: { id: Tab; label: string }[] = [
  { id: "assignment", label: "公開設定" },
  { id: "video", label: "本編登録" },
  { id: "salesperson", label: "営業マン管理" },
  { id: "housemaker", label: "ハウスメーカー" },
  { id: "venue", label: "会場管理" },
  { id: "learning", label: "学習コンテンツ" },
];

export function AdminDashboardClient({
  initialAssignments,
  salespersons,
  activeVideos,
  initialHouseMakers,
}: AdminDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("assignment");

  return (
    <div className="bg-gray-900 rounded-xl">
      <div className="flex border-b border-gray-700 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        <div className={activeTab === "salesperson" ? "" : "hidden"}>
          <SalespersonManagerClient initialHouseMakers={initialHouseMakers} />
        </div>
        <div className={activeTab === "housemaker" ? "" : "hidden"}>
          <HouseMakerManagerClient />
        </div>
        <div className={activeTab === "venue" ? "" : "hidden"}>
          <VenueManagerClient />
        </div>
        <div className={activeTab === "assignment" ? "" : "hidden"}>
          <AssignmentManagerClient
            initialAssignments={initialAssignments}
            salespersons={salespersons}
            videos={activeVideos}
          />
        </div>
        <div className={activeTab === "video" ? "" : "hidden"}>
          <VideoManagerClient />
        </div>
        <div className={activeTab === "learning" ? "" : "hidden"}>
          <LearningContentManagerClient />
        </div>
      </div>
    </div>
  );
}
