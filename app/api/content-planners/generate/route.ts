import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY tidak ditemukan di environment" },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { plannerIds?: string[]; templateId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const plannerIds = body.plannerIds as string[] | undefined;
  const templateId = body.templateId as string | undefined;
  if (!plannerIds || !Array.isArray(plannerIds) || plannerIds.length === 0) {
    return NextResponse.json(
      { error: "plannerIds wajib berupa array tidak kosong" },
      { status: 400 }
    );
  }

  const { data: planners } = await supabase
    .from("content_planners")
    .select(
      `
      id,
      company_id,
      post_title,
      content_description,
      platform,
      goal,
      keywords,
      hashtags,
      companies (name, brand_voice, target_audience, tone)
    `
    )
    .in("id", plannerIds)
    .eq("status", "draft");

  if (!planners?.length) {
    return NextResponse.json(
      { error: "Tidak ada planner draft yang ditemukan" },
      { status: 404 }
    );
  }

  let templateContent: string | null = null;
  if (templateId) {
    const { data: t } = await supabase
      .from("templates")
      .select("template_content")
      .eq("id", templateId)
      .single();
    templateContent = t?.template_content ?? null;
  }

  const openai = new OpenAI({ apiKey });
  let generated = 0;

  for (const planner of planners) {
    const company = planner.companies as unknown as Record<string, string> | null;
    const brandContext = company
      ? [
          company.name && `Brand: ${company.name}`,
          company.brand_voice && `Brand Voice: ${company.brand_voice}`,
          company.target_audience &&
            `Target Audience: ${company.target_audience}`,
          company.tone && `Tone: ${company.tone}`,
        ]
          .filter(Boolean)
          .join("\n")
      : "";

    const prompt = `
${templateContent}

Respon dalam format JSON saja:
{
  "result_text": "A long, engaging main content text written in clear and professional English. It should provide value to the reader, explain the topic thoroughly, and maintain an informative yet approachable tone. The content should be well-structured, easy to read, and suitable for use in blog posts, marketing materials, or educational content.",
  "result_caption": "A short, punchy caption suitable for social media that summarizes the main idea and encourages engagement.",
  "result_image_prompt": "A detailed visual description used to generate an AI image. It should clearly describe the scene, environment, people, lighting, mood, composition, and style so the AI can produce a high-quality and relevant image."
}`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) continue;

      const parsed = JSON.parse(content) as {
        result_text?: string;
        result_caption?: string;
        result_image_prompt?: string;
      };

      await supabase.from("ai_prompts").insert({
        planner_id: planner.id,
        company_id: planner.company_id,
        prompt,
      });

      await supabase.from("ai_results").insert({
        planner_id: planner.id,
        result_text: parsed.result_text ?? "",
        result_caption: parsed.result_caption ?? "",
        result_image_prompt: parsed.result_image_prompt ?? "",
      });

      await supabase
        .from("content_planners")
        .update({ status: "generated" })
        .eq("id", planner.id);

      generated++;
    } catch (err) {
      console.error("OpenAI error for planner", planner.id, err);
    }
  }

  return NextResponse.json({ generated });
}
