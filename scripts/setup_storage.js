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
    process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function setupStorage() {
    console.log('Checking storage buckets...')

    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
        console.error('Error listing buckets:', listError)
        return
    }

    const avatarsBucket = buckets.find(b => b.name === 'avatars')

    if (avatarsBucket) {
        console.log('✅ "avatars" bucket already exists.')

        // Update to public if not already
        if (!avatarsBucket.public) {
            console.log('Updating bucket to be public...')
            const { error: updateError } = await supabase.storage.updateBucket('avatars', {
                public: true
            })
            if (updateError) console.error('Error updating bucket:', updateError)
            else console.log('✅ Bucket updated to public.')
        }
    } else {
        console.log('Creating "avatars" bucket...')
        const { data, error: createError } = await supabase.storage.createBucket('avatars', {
            public: true,
            fileSizeLimit: 5242880, // 5MB
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
        })

        if (createError) {
            console.error('Error creating bucket:', createError)
        } else {
            console.log('✅ "avatars" bucket created successfully!')
        }
    }

    console.log('Storage setup complete.')
}

setupStorage()
