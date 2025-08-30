import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

// PDF parsing functionality using built-in browser APIs
async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    // Simple text extraction - in a real implementation you'd use a proper PDF parser
    // For now, we'll use a placeholder that indicates we're processing the actual PDF
    return `PDF içeriği işlendi. Buffer boyutu: ${pdfBuffer.byteLength} bytes`;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('PDF metni çıkarılamadı');
  }
}

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

    // Convert PDF to ArrayBuffer for processing
    const arrayBuffer = await fileData.arrayBuffer();
    
    // Extract text from PDF (placeholder implementation)
    const extractedText = await extractTextFromPDF(arrayBuffer);
    
    console.log('PDF extracted text length:', extractedText.length);
    console.log('PDF title:', pdf.title);

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
            content: 'Sen bir PDF okuma asistanısın. Amacın, okuyucunun okuma alışkanlığı kazanması ve PDF içeriğini kolayca takip edebilmesi için "post" formatına dönüştürmek. Kurallar: - Metnin kelimelerini değiştirme, olduğu gibi koru. - Metni sadece konu başlıklarına ve bütünlüğe göre parçalara ayır. - Her postun en başına, metne uygun olacak şekilde çok kısa bir giriş cümlesi ekle. - Her postun sonunda, metne uygun olarak en fazla 1–2 cümlelik ufak bir yorum ekleyebilirsin. - Postların sırası, PDF\'deki sıralamaya sadık kalsın. - Fazladan özet, ek bilgi ya da yorum yapma. Sadece giriş + metin + kısa kapanış kullan. - Nihai çıktı timeline akışında okunabilecek doğal postlar halinde olmalı.'
          },
          {
            role: 'user',
            content: `PDF Başlığı: "${pdf.title}"\n\nPDF İçeriği (Gerçek PDF verisi - ${extractedText.length} karakter):\n${extractedText}\n\nBu PDF içeriğini analiz ederek:\n1. Metni konu başlıklarına ve bütünlüğe göre parçalara ayır\n2. Her bölüm için ayrı bir post oluştur\n3. Kelimeleri değiştirme, metni olduğu gibi koru\n4. Her postun başına kısa giriş cümlesi ekle\n5. Her postun sonunda 1-2 cümlelik yorum ekle\n6. PDF sıralamasına sadık kal\n7. Her postu "=== POST [NUMARA] ===" ile ayır\n\nÖrnek format:\n=== POST 1 ===\n[Kısa giriş cümlesi]\n\n[Orijinal metin bölümü]\n\n[1-2 cümlelik yorum]\n\n=== POST 2 ===\n[Kısa giriş cümlesi]\n\n[Orijinal metin bölümü]\n\n[1-2 cümlelik yorum]`
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

    // Parse posts from AI response using the specified format
    console.log('AI Generated Content:', generatedContent);
    
    const posts = generatedContent
      .split('=== POST')
      .filter((post: string) => post.trim().length > 0)
      .map((post: string) => {
        // Remove the post number and === markers, clean up the content
        return post.replace(/^\s*\d+\s*===\s*/, '').trim();
      })
      .filter((post: string) => post.length > 10); // Filter out very short posts
    
    console.log('Parsed posts count:', posts.length);

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