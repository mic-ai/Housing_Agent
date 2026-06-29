"use client";

import { useState } from "react";
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
    (d) => (d.contactMethod === "LINE" ? !!d.lineId : !!d.email),
    { message: "連絡先を入力してください", path: ["lineId"] }
  );

type FormData = z.infer<typeof schema>;

interface ContactFormProps {
  salespersonId: string;
  videoId?: string;
  defaultMethod?: "LINE" | "EMAIL";
}

const inputClass =
  "w-full px-3 py-3 bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-sm";

const selectClass =
  "w-full px-3 py-2.5 bg-white border border-stone-200 rounded-lg text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm shadow-sm";

export function ContactForm({ salespersonId, videoId, defaultMethod = "LINE" }: ContactFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

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
    setSubmitError(null);
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
      setSubmitError("送信に失敗しました。しばらくしてから再度お試しください。");
      return;
    }

    const { data: result } = await res.json();
    router.push(`/booking/${result.id}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Submit error banner */}
      {submitError && (
        <div role="alert" className="flex items-start gap-2 bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {submitError}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          お名前 <span className="text-red-400">*</span>
        </label>
        <input {...register("name")} className={inputClass} />
        {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          連絡方法 <span className="text-red-400">*</span>
        </label>
        <div className="flex gap-3">
          {(["LINE", "EMAIL"] as const).map((m) => (
            <label key={m} className="flex items-center gap-2 cursor-pointer min-h-[44px]">
              <input
                type="radio"
                value={m}
                {...register("contactMethod")}
                className="accent-amber-500 w-4 h-4"
              />
              <span className="text-stone-700 text-sm">{m === "LINE" ? "LINE" : "メール"}</span>
            </label>
          ))}
        </div>
      </div>

      {contactMethod === "LINE" && (
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            LINE ID <span className="text-red-400">*</span>
          </label>
          <input
            {...register("lineId")}
            placeholder="@your-line-id"
            className={inputClass}
          />
          {errors.lineId && <p className="text-red-400 text-xs mt-1">{errors.lineId.message}</p>}
        </div>
      )}

      {contactMethod === "EMAIL" && (
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            メールアドレス <span className="text-red-400">*</span>
          </label>
          <input {...register("email")} type="email" className={inputClass} />
          {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">電話番号</label>
        <input {...register("phone")} type="tel" className={inputClass} />
      </div>

      <fieldset className="border border-stone-200 rounded-lg p-4 space-y-3 bg-white shadow-sm">
        <legend className="text-sm font-medium text-stone-600 px-2">アンケート（任意）</legend>

        <div>
          <label className="block text-xs text-stone-500 mb-1">購入検討時期</label>
          <select {...register("purchaseTiming")} className={selectClass}>
            <option value="">選択してください</option>
            <option value="3months">3ヶ月以内</option>
            <option value="6months">6ヶ月以内</option>
            <option value="1year">1年以内</option>
            <option value="considering">検討中</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-stone-500 mb-1">希望エリア</label>
          <input
            {...register("area")}
            placeholder="例: 名古屋市・中区"
            className={selectClass}
          />
        </div>

        <div>
          <label className="block text-xs text-stone-500 mb-1">予算感</label>
          <select {...register("budget")} className={selectClass}>
            <option value="">選択してください</option>
            <option value="under3000">〜3,000万円</option>
            <option value="under4000">〜4,000万円</option>
            <option value="under5000">〜5,000万円</option>
            <option value="over5000">5,000万円〜</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-stone-500 mb-1">メッセージ</label>
          <textarea
            {...register("message")}
            rows={3}
            className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-lg text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm resize-none shadow-sm"
          />
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 disabled:bg-stone-200 disabled:text-stone-400 text-white font-medium rounded-lg transition-colors"
      >
        {isSubmitting ? "送信中..." : "連絡を申請する"}
      </button>
    </form>
  );
}
