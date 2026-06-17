"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";

const schema = z
  .object({
    name: z.string().min(1, "お名前を入力してください"),
    contactMethod: z.enum(["LINE", "EMAIL"]),
    lineId: z.string().optional(),
    email: z.string().email("正しいメールアドレスを入力してください").optional().or(z.literal("")),
    phone: z.string().optional(),
    purchaseTiming: z.string().optional(),
    area: z.string().optional(),
    budget: z.string().optional(),
    message: z.string().optional(),
  })
  .refine(
    (d) =>
      d.contactMethod === "LINE" ? !!d.lineId : !!d.email,
    {
      message: "連絡先を入力してください",
      path: ["lineId"],
    }
  );

type FormData = z.infer<typeof schema>;

interface ContactFormProps {
  salespersonId: string;
  videoId?: string;
  defaultMethod?: "LINE" | "EMAIL";
}

export function ContactForm({ salespersonId, videoId, defaultMethod = "LINE" }: ContactFormProps) {
  const router = useRouter();
  const {
    register,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { contactMethod: defaultMethod },
  });

  const contactMethod = watch("contactMethod");

  async function onSubmit(data: FormData) {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        salespersonId,
        videoId,
        questionnaire: {
          purchaseTiming: data.purchaseTiming,
          area: data.area,
          budget: data.budget,
          message: data.message,
        },
      }),
    });

    if (!res.ok) {
      alert("送信に失敗しました。もう一度お試しください。");
      return;
    }

    const { data: result } = await res.json();
    router.push(`/booking/${result.id}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          お名前 <span className="text-red-400">*</span>
        </label>
        <input
          {...register("name")}
          className="w-full px-3 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          連絡方法 <span className="text-red-400">*</span>
        </label>
        <div className="flex gap-3">
          {(["LINE", "EMAIL"] as const).map((m) => (
            <label key={m} className="flex items-center gap-2 cursor-pointer min-h-[44px]">
              <input
                type="radio"
                value={m}
                {...register("contactMethod")}
                className="accent-blue-500 w-4 h-4"
              />
              <span className="text-white text-sm">{m === "LINE" ? "LINE" : "メール"}</span>
            </label>
          ))}
        </div>
      </div>

      {contactMethod === "LINE" && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            LINE ID <span className="text-red-400">*</span>
          </label>
          <input
            {...register("lineId")}
            placeholder="@your-line-id"
            className="w-full px-3 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.lineId && <p className="text-red-400 text-xs mt-1">{errors.lineId.message}</p>}
        </div>
      )}

      {contactMethod === "EMAIL" && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            メールアドレス <span className="text-red-400">*</span>
          </label>
          <input
            {...register("email")}
            type="email"
            className="w-full px-3 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">電話番号</label>
        <input
          {...register("phone")}
          type="tel"
          className="w-full px-3 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <fieldset className="border border-gray-700 rounded-lg p-4 space-y-3">
        <legend className="text-sm font-medium text-gray-300 px-2">アンケート（任意）</legend>

        <div>
          <label className="block text-xs text-gray-400 mb-1">購入検討時期</label>
          <select
            {...register("purchaseTiming")}
            className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none text-sm"
          >
            <option value="">選択してください</option>
            <option value="3months">3ヶ月以内</option>
            <option value="6months">6ヶ月以内</option>
            <option value="1year">1年以内</option>
            <option value="considering">検討中</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">希望エリア</label>
          <input
            {...register("area")}
            placeholder="例: 名古屋市・中区"
            className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none text-sm"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">予算感</label>
          <select
            {...register("budget")}
            className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none text-sm"
          >
            <option value="">選択してください</option>
            <option value="under3000">〜3,000万円</option>
            <option value="under4000">〜4,000万円</option>
            <option value="under5000">〜5,000万円</option>
            <option value="over5000">5,000万円〜</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">メッセージ</label>
          <textarea
            {...register("message")}
            rows={3}
            className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none text-sm resize-none"
          />
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors"
      >
        {isSubmitting ? "送信中..." : "連絡を申請する"}
      </button>
    </form>
  );
}
