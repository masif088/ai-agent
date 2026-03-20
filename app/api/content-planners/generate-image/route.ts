import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import OpenAI from "openai";
import sharp from "sharp";

export const dynamic = "force-dynamic";

const BUCKET = "generated-images";

/** GET: Returns the final prompt (with template vars replaced) for copy/debug. Query: resultId, templateId? */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const resultId = url.searchParams.get("resultId") ?? undefined;
  const templateId = url.searchParams.get("templateId") ?? undefined;

  if (!resultId) {
    return NextResponse.json(
      { error: "resultId is required" },
      { status: 400 }
    );
  }

  const { data: aiResult, error: fetchError } = await supabase
    .from("ai_results")
    .select("id, result_image_prompt, planner_id, result_text, result_caption")
    .eq("id", resultId)
    .single();

  if (fetchError || !aiResult) {
    return NextResponse.json(
      { error: "AI result not found" },
      { status: 404 }
    );
  }

  const { data: planner, error: plannerError } = await supabase
    .from("content_planners")
    .select(`
      company_id,
      post_title,
      content_description,
      platform,
      division,
      post_type,
      hashtags,
      target_location,
      goal,
      keywords,
      week,
      companies (name, brand_voice, target_audience, tone)
    `)
    .eq("id", aiResult.planner_id)
    .single();

  if (plannerError || !planner) {
    return NextResponse.json(
      { error: "Planner not found" },
      { status: 404 }
    );
  }

  const company = planner.companies as unknown as Record<string, string> | null;

  const basePrompt = aiResult.result_image_prompt?.trim();
  if (!basePrompt) {
    return NextResponse.json(
      { error: "No result_image_prompt for this result" },
      { status: 400 }
    );
  }

  const vars: Record<string, string> = {
    post_title: String(planner.post_title ?? ""),
    title: String(planner.post_title ?? ""),
    content_description: String(planner.content_description ?? ""),
    platform: String(planner.platform ?? ""),
    division: String(planner.division ?? ""),
    post_type: String(planner.post_type ?? ""),
    hashtags: String(planner.hashtags ?? ""),
    target_location: String(planner.target_location ?? ""),
    goal: String(planner.goal ?? ""),
    keywords: String(planner.keywords ?? ""),
    week: planner.week != null ? String(planner.week) : "",
    company_name: company?.name ?? "",
    brand_voice: company?.brand_voice ?? "",
    target_audience: company?.target_audience ?? "",
    tone: company?.tone ?? "",
    result_text: aiResult.result_text ?? "",
    result_caption: aiResult.result_caption ?? "",
    result_image_prompt: basePrompt,
  };

  function replaceTemplateVars(text: string): string {
    return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
  }

  let finalPrompt = basePrompt;
  if (templateId) {
    const { data: template } = await supabase
      .from("templates")
      .select("template_content")
      .eq("id", templateId)
      .single();

    if (template?.template_content) {
      finalPrompt = replaceTemplateVars(String(template.template_content));
    }
  }

  return NextResponse.json({ prompt: finalPrompt });
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not found in environment" },
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

  let body: { resultId?: string; templateId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const resultId = body.resultId as string | undefined;
  const templateId = body.templateId as string | undefined;

  if (!resultId) {
    return NextResponse.json(
      { error: "resultId is required" },
      { status: 400 }
    );
  }

  const { data: aiResult, error: fetchError } = await supabase
    .from("ai_results")
    .select("id, result_image_prompt, planner_id, result_text, result_caption")
    .eq("id", resultId)
    .single();

  if (fetchError || !aiResult) {
    return NextResponse.json(
      { error: "AI result not found" },
      { status: 404 }
    );
  }

  const { data: planner, error: plannerError } = await supabase
    .from("content_planners")
    .select(`
      company_id,
      post_title,
      content_description,
      platform,
      division,
      post_type,
      hashtags,
      target_location,
      goal,
      keywords,
      week,
      companies (name, brand_voice, target_audience, tone)
    `)
    .eq("id", aiResult.planner_id)
    .single();

  if (plannerError || !planner) {
    return NextResponse.json(
      { error: "Planner not found" },
      { status: 404 }
    );
  }

  const companyId = planner.company_id;
  const company = planner.companies as unknown as Record<string, string> | null;

  const basePrompt = aiResult.result_image_prompt?.trim();
  if (!basePrompt) {
    return NextResponse.json(
      { error: "No result_image_prompt for this result" },
      { status: 400 }
    );
  }

  // Build variable map for template replacement (all template variables from content_planner, company, ai_results)
  const vars: Record<string, string> = {
    post_title: String(planner.post_title ?? ""),
    title: String(planner.post_title ?? ""), // alias for post_title
    content_description: String(planner.content_description ?? ""),
    platform: String(planner.platform ?? ""),
    division: String(planner.division ?? ""),
    post_type: String(planner.post_type ?? ""),
    hashtags: String(planner.hashtags ?? ""),
    target_location: String(planner.target_location ?? ""),
    goal: String(planner.goal ?? ""),
    keywords: String(planner.keywords ?? ""),
    week: planner.week != null ? String(planner.week) : "",
    company_name: company?.name ?? "",
    brand_voice: company?.brand_voice ?? "",
    target_audience: company?.target_audience ?? "",
    tone: company?.tone ?? "",
    result_text: aiResult.result_text ?? "",
    result_caption: aiResult.result_caption ?? "",
    result_image_prompt: basePrompt,
  };

  function replaceTemplateVars(text: string): string {
    return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
  }

  let finalPrompt = basePrompt;
  let templateImages: { url: string; label: string }[] = [];
  if (templateId) {
    const { data: template } = await supabase
      .from("templates")
      .select("template_content, template_images")
      .eq("id", templateId)
      .single();

    if (template?.template_content) {
      finalPrompt = replaceTemplateVars(String(template.template_content));
    }
    const imgs = template?.template_images;
    templateImages = Array.isArray(imgs) ? imgs.filter((i) => i?.url) : [];
  }

  const openai = new OpenAI({ apiKey });
  const IMAGE_COUNT = 1;
  const logoUrl = templateImages[0]?.url;

  try {
    console.log("finalPrompt", finalPrompt);

    const responses = await Promise.all(
      Array.from({ length: IMAGE_COUNT }, () =>
        openai.images.generate({
          model: "gpt-image-1.5",
          prompt: finalPrompt,
          n: 1,
          quality: "high",
        })
      )
    );

    const imageDataList = responses
      .map((r) => r.data?.[0])
      .filter((item): item is NonNullable<typeof item> => !!item);
    let base64List = imageDataList
      .map((item) => ("b64_json" in item ? item.b64_json : null))
      .filter((b): b is string => !!b);

    if (base64List.length === 0) {
      return NextResponse.json(
        { error: "No image data returned from OpenAI" },
        { status: 500 }
      );
    }

    const storageClient = (() => {
      try {
        return createAdminClient();
      } catch {
        return null;
      }
    })() ?? supabase;

    const timestamp = Date.now();
    const storedUrls: string[] = [];

    for (let i = 0; i < base64List.length; i++) {
      let finalUrl = "";
      try {
        let imageBuffer = Buffer.from(base64List[i], "base64");

        if (logoUrl) {
          try {
            const baseImage = sharp(imageBuffer);
            const meta = await baseImage.metadata();
            const baseW = meta.width ?? 1024;
            const baseH = meta.height ?? 1024;
            const logoMaxSize = Math.min(baseW, baseH) * 0.25;
            const padding = Math.round(Math.min(baseW, baseH) * 0.03);

            const logoRes = await fetch(logoUrl);
            if (logoRes.ok) {
              const logoBuffer = Buffer.from(await logoRes.arrayBuffer());
              const logoResized = await sharp(logoBuffer)
                .resize(Math.round(logoMaxSize), Math.round(logoMaxSize), { fit: "inside" })
                .png()
                .toBuffer();

              const composited = await baseImage
                .composite([{ input: logoResized, top: padding, left: padding }])
                .png()
                .toBuffer();
              imageBuffer = Buffer.from(composited);
            }
          } catch (overlayErr) {
            console.error("Logo overlay failed, using base image:", overlayErr);
          }
        }

        const fileName = `${aiResult.planner_id}/${resultId}-${timestamp}-${i}.png`;

        const { data: uploadData, error: uploadError } = await storageClient.storage
          .from(BUCKET)
          .upload(fileName, imageBuffer, {
            contentType: "image/png",
            upsert: true,
          });

        if (!uploadError && uploadData?.path) {
          const { data: urlData } = storageClient.storage
            .from(BUCKET)
            .getPublicUrl(uploadData.path);
          finalUrl = urlData.publicUrl;
        }
      } catch (storageErr) {
        console.error(`Storage upload failed for image ${i}:`, storageErr);
      }
      if (finalUrl) storedUrls.push(finalUrl);
    }

    if (storedUrls.length === 0) {
      return NextResponse.json(
        { error: "Image generation succeeded but storage upload failed" },
        { status: 500 }
      );
    }

    const resultImageUrl =
      storedUrls.length === 1
        ? storedUrls[0]
        : JSON.stringify(storedUrls);

    const { error: updateError } = await supabase
      .from("ai_results")
      .update({ result_image_url: resultImageUrl })
      .eq("id", resultId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to save image URL: " + updateError.message },
        { status: 500 }
      );
    }

    // Save to ai_prompts for history
    const imagePromptText = `[Image Generation - GPT Image 1.5 x${storedUrls.length}]\n${finalPrompt}`;
    const { error: promptError } = await supabase.from("ai_prompts").insert({
      planner_id: aiResult.planner_id,
      company_id: companyId,
      prompt: imagePromptText,
    });
    if (promptError) {
      console.error("Failed to save to ai_prompts:", promptError.message);
    }

    return NextResponse.json({
      success: true,
      imageUrls: storedUrls,
      imageCount: storedUrls.length,
    });
  } catch (err) {
    console.error("OpenAI image generation error:", err);
    const msg = err instanceof Error ? err.message : "Image generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
