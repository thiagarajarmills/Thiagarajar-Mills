require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function setupBucket() {
    console.log("Creating bucket 'documents'...");
    const { data, error } = await supabase.storage.createBucket('documents', { public: true });
    
    if (error) {
        if (error.message && error.message.includes('already exists') || error.name === 'Duplicate' || error.error === 'Duplicate') {
            console.log("Bucket 'documents' already exists. Making sure it is public...");
            await supabase.storage.updateBucket('documents', { public: true });
            console.log("Done.");
        } else {
            console.error("Error creating bucket:", error);
        }
    } else {
        console.log("Bucket 'documents' created successfully as a public bucket!");
    }
}

setupBucket();
