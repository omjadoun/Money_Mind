import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Load env vars
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env')
    console.log('Please add SUPABASE_SERVICE_ROLE_KEY to your .env file from the Supabase Dashboard > Project Settings > API')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function cleanupUser() {
    const userId = '841fc954-0175-4580-b829-ecaeef9a58db' // User ID from the JSON provided
    console.log(`Cleaning up metadata for user ${userId}...`)

    const { data, error: getUserError } = await supabase.auth.admin.getUserById(userId)

    if (getUserError || !data || !data.user) {
        console.error('Error fetching user:', getUserError)
        return
    }

    const user = data.user
    console.log('Current metadata keys:', Object.keys(user.user_metadata || {}))

    // Remove avatar_url
    const { data: updateData, error } = await supabase.auth.admin.updateUserById(
        userId,
        { user_metadata: { ...user.user_metadata, avatar_url: null } }
    )

    if (error) {
        console.error('Error updating user:', error)
    } else {
        console.log('Successfully removed avatar_url from user metadata!')
        if (updateData && updateData.user) {
            console.log('New metadata keys:', Object.keys(updateData.user.user_metadata || {}))
        }
    }
}

cleanupUser()
