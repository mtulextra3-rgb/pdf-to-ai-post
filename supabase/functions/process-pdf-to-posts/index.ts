import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

// PDF text extraction using pdf-parse library
async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    // Import pdf-parse for text extraction
    const { default: pdfParse } = await import('npm:pdf-parse@1.1.1');
    
    // Convert ArrayBuffer to Buffer for pdf-parse
    const buffer = new Uint8Array(pdfBuffer);
    
    // Extract text using pdf-parse
    const data = await pdfParse(buffer);
    
    console.log('PDF text extraction successful. Text length:', data.text.length);
    console.log('PDF info:', {
      pages: data.numpages,
      info: data.info
    });
    
    if (!data.text || data.text.trim().length === 0) {
      // If no text extracted, try OCR approach
      console.log('No text found in PDF, might be image-based PDF');
      return 'PDF görsel tabanlı olabilir ve metin çıkarılamadı. Lütfen metin içeren bir PDF kullanın.';
    }
    
    return data.text.trim();
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('PDF metni çıkarılamadı: ' + error.message);
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
            content: `Sen bir PDF okuma asistanısın. Amacın, okuyucunun okuma alışkanlığı kazanması ve PDF içeriğini kolayca takip edebilmesi için "okuma kartları" oluşturmak. 

Kurallar:
- Metnin kelimelerini değiştirme, olduğu gibi koru.
- Metni konusuna ve bütünlüğe göre anlamlı parçalara ayır.
- Her kartta sadece ilgili metin yer alsın, başlık ekleme.
- Fazladan özet, yorum ya da giriş/kapanış ekleme.
- Kartların sırası PDF'deki sıralamaya sadık kalsın.
- Nihai çıktı: "=== KART [NUMARA] ===" formatıyla ayrılmış okuma kartları.`
          },
          {
            role: 'user',
            content: `PDF Başlığı: "${pdf.title}"\n\nPDF İçeriği (Gerçek PDF verisi - ${extractedText.length} karakter):\n${extractedText}\n\nBu PDF içeriğini analiz ederek:\n1. Metni konusuna ve bütünlüğe göre anlamlı parçalara ayır\n2. Her bölüm için bir "okuma kartı" oluştur\n3. Her kartta sadece metin yer alsın, başlık ekleme\n4. Kelimeleri değiştirme\n5. PDF sıralamasına sadık kal\n6. Her kartı "=== KART [NUMARA] ===" ile ayır\n\nÖrnek format:\n=== KART 1 ===\n[Orijinal metin bölümü]\n\n=== KART 2 ===\n[Orijinal metin bölümü]`
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
    console.log('AI Generated Content Length:', generatedContent.length);
    console.log('AI Generated Content Preview:', generatedContent.substring(0, 500));
    
    // Split by "=== KART" and process each part
    const cardParts = generatedContent.split(/=== KART \d+ ===/);
    console.log('Split parts count:', cardParts.length);
    
    // Filter out empty parts and process valid cards
    const posts = cardParts
      .map((part: string) => part.trim())
      .filter((part: string) => part.length > 20) // Filter out very short or empty parts
      .map((part: string) => {
        // Clean up any remaining formatting
        return part.replace(/^=+\s*/, '').replace(/\s*=+$/, '').trim();
      });
    
    console.log('Processed cards:', posts.map((p, i) => `Card ${i + 1}: ${p.substring(0, 100)}...`));
    
    console.log('Parsed posts count:', posts.length);

    // Function to get random image from Unsplash collection
    const getUnsplashImageUrl = async (seedId: string) => {
      try {
        const collectionId = 'YUJj5hPgZfg'; // User's specified collection
        const seed = seedId.substring(0, 8);
        
        const response = await fetch(`https://api.unsplash.com/photos/random?collections=${collectionId}&client_id=${Deno.env.get('UNSPLASH_ACCESS_KEY')}`);
        
        if (!response.ok) {
          console.error('Unsplash API Error:', response.status);
          // Fallback to a deterministic URL based on seed
          return `https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&seed=${seed}`;
        }
        
        const data = await response.json();
        return data.urls?.regular || `https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&seed=${seed}`;
      } catch (error) {
        console.error('Error fetching Unsplash image:', error);
        // Return a fallback image with seed for consistency
        return `https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&seed=${seedId.substring(0, 8)}`;
      }
    };

    // Save reading cards to database with assigned images
    const postsToInsert = await Promise.all(
      posts.map(async (content: string, index: number) => {
        // Generate unique but consistent seed for each post
        const postSeed = `${pdfId}-${index}`;
        const imageUrl = await getUnsplashImageUrl(postSeed);
        
        return {
          user_id: pdf.user_id,
          pdf_id: pdfId,
          title: `${pdf.title} - Kart ${index + 1}`,
          content: content.trim(),
          post_order: index + 1,
          image_url: imageUrl,
          metadata: {
            source_pdf: pdf.title,
            generated_at: new Date().toISOString(),
            type: 'reading_card',
            image_seed: postSeed
          }
        };
      })
    );

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
        message: 'PDF successfully processed into reading cards' 
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