import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create client with user's token to get their ID
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Delete user data in order (respecting foreign keys)
    const userId = user.id

    // Delete notifications
    await supabaseAdmin.from('notifications').delete().eq('user_id', userId)
    await supabaseAdmin.from('notifications').delete().eq('actor_id', userId)

    // Delete votes
    await supabaseAdmin.from('post_votes').delete().eq('user_id', userId)
    await supabaseAdmin.from('comment_votes').delete().eq('user_id', userId)
    await supabaseAdmin.from('poll_votes').delete().eq('user_id', userId)

    // Delete bookmarks
    await supabaseAdmin.from('bookmarks').delete().eq('user_id', userId)
    await supabaseAdmin.from('bookmark_folders').delete().eq('user_id', userId)

    // Delete follows
    await supabaseAdmin.from('follows').delete().eq('follower_id', userId)
    await supabaseAdmin.from('follows').delete().eq('following_id', userId)

    // Delete blocked users
    await supabaseAdmin.from('blocked_users').delete().eq('blocker_id', userId)
    await supabaseAdmin.from('blocked_users').delete().eq('blocked_id', userId)

    // Delete messages and conversations
    await supabaseAdmin.from('messages').delete().eq('sender_id', userId)
    const { data: participations } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId)
    
    if (participations && participations.length > 0) {
      await supabaseAdmin.from('conversation_participants').delete().eq('user_id', userId)
    }

    // Delete community memberships and roles
    await supabaseAdmin.from('community_members').delete().eq('user_id', userId)
    await supabaseAdmin.from('community_roles').delete().eq('user_id', userId)
    await supabaseAdmin.from('community_user_flairs').delete().eq('user_id', userId)

    // Delete comments (this will cascade to comment votes)
    await supabaseAdmin.from('comments').delete().eq('user_id', userId)

    // Delete posts (this will cascade to related data)
    await supabaseAdmin.from('posts').delete().eq('user_id', userId)

    // Delete reports
    await supabaseAdmin.from('reports').delete().eq('reporter_id', userId)

    // Delete karma history
    await supabaseAdmin.from('karma_history').delete().eq('user_id', userId)

    // Delete email preferences
    await supabaseAdmin.from('email_preferences').delete().eq('user_id', userId)

    // Delete push subscriptions
    await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', userId)

    // Delete profile
    await supabaseAdmin.from('profiles').delete().eq('user_id', userId)

    // Finally delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (deleteError) {
      console.error('Error deleting auth user:', deleteError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
