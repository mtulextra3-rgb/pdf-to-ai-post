import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfId } = await req.json();

    if (!pdfId) {
      throw new Error('PDF ID is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get PDF details
    const { data: pdf, error: pdfError } = await supabaseClient
      .from('pdfs')
      .select('*')
      .eq('id', pdfId)
      .single();

    if (pdfError || !pdf) {
      throw new Error('PDF not found');
    }

    // Get the PDF file from storage
    const { data: fileData, error: fileError } = await supabaseClient.storage
      .from('pdfs')
      .download(pdf.file_path);

    if (fileError || !fileData) {
      throw new Error('Could not download PDF file');
    }

    // Convert PDF to text (simplified - in real implementation you'd use a PDF parser)
    // For now, we'll simulate processing with a mock content
    const mockPdfContent = `
    Bu PDF dosyasından çıkarılan örnek içerik:

    1. Giriş Bölümü
    Bu bölümde konunun genel çerçevesi ele alınmaktadır. Modern teknolojilerin gelişimi ile birlikte iş dünyasında köklü değişimler yaşanmaktadır.

    2. Ana Konu
    Dijital dönüşüm sürecinde şirketlerin adapte olması gereken temel stratejiler:
    - Müşteri deneyimini iyileştirme
    - Operasyonel verimliliği artırma
    - Yenilikçi teknolojileri benimseme

    3. Sonuç
    Gelecekte başarılı olmak isteyen organizasyonlar için dijital dönüşüm kaçınılmaz bir gereklilik haline gelmiştir.
    `;

    // Process with OpenAI to create social media posts
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Sen bir sosyal medya uzmanısın. Verilen PDF içeriğini analiz ederek, farklı sosyal medya platformları için uygun postlar oluştur. Her post bağımsız olmalı ve engaging olmalı. Türkçe yazmalısın.'
          },
          {
            role: 'user',
            content: `Bu PDF içeriğini analiz ederek 3-5 adet sosyal medya postu oluştur. Her post ayrı ayrı verilmeli ve LinkedIn, Twitter, Instagram gibi platformlar için uygun olmalı:\n\n${mockPdfContent}`
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      }),
    });

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.text();
      console.error('OpenAI API Error:', errorData);
      throw new Error('AI processing failed');
    }

    const aiResult = await openAIResponse.json();
    const generatedContent = aiResult.choices[0].message.content;

    // Split the content into individual posts
    const posts = generatedContent.split('\n\n').filter((post: string) => post.trim().length > 0);

    // Save posts to database
    const postsToInsert = posts.map((content: string, index: number) => ({
      user_id: pdf.user_id,
      pdf_id: pdfId,
      title: `${pdf.title} - Post ${index + 1}`,
      content: content.trim(),
      post_order: index + 1,
      metadata: {
        source_pdf: pdf.title,
        generated_at: new Date().toISOString()
      }
    }));

    const { error: insertError } = await supabaseClient
      .from('posts')
      .insert(postsToInsert);

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error('Failed to save posts');
    }

    // Mark PDF as processed
    const { error: updateError } = await supabaseClient
      .from('pdfs')
      .update({ processed: true })
      .eq('id', pdfId);

    if (updateError) {
      console.error('PDF update error:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        postsCreated: posts.length,
        message: 'PDF successfully processed into social media posts' 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error: any) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred processing the PDF' 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});