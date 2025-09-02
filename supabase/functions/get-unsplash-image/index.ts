import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { collectionId, seed } = await req.json()
    const accessKey = Deno.env.get('UNSPLASH_ACCESS_KEY')

    if (!accessKey) {
      throw new Error('Unsplash access key not configured')
    }

    console.log(`Fetching image from collection: ${collectionId} with seed: ${seed}`)

    // Get a random photo from the specified collection
    const unsplashUrl = `https://api.unsplash.com/photos/random?collections=${collectionId}&client_id=${accessKey}`
    
    const response = await fetch(unsplashUrl)
    
    if (!response.ok) {
      console.error('Unsplash API error:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('Error details:', errorText)
      throw new Error(`Unsplash API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('Successfully fetched image:', data.id)

    // Return the image data with necessary URLs
    return new Response(
      JSON.stringify({
        id: data.id,
        urls: {
          regular: data.urls.regular,
          small: data.urls.small,
          thumb: data.urls.thumb,
        },
        alt_description: data.alt_description,
        description: data.description,
        user: {
          name: data.user.name,
          username: data.user.username,
        },
        links: {
          html: data.links.html,
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
        } 
      }
    )
  } catch (error) {
    console.error('Error in get-unsplash-image function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch image', 
        details: error.message 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }, 
        status: 500 
      }
    )
  }
})