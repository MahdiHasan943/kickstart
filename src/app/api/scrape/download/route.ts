import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import ExcelJS from 'exceljs';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { jobId } = await request.json();
        console.log('Download request for job:', jobId, 'by user:', user.id);

        // 1. Verify Job Ownership first (to ensure security)
        const { data: job, error: jobError } = await supabase
            .from('scraper_jobs')
            .select('id, user_id')
            .eq('id', jobId)
            .single();

        if (jobError || !job) {
            console.error('Job not found or access denied:', jobError);
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        if (job.user_id !== user.id) {
            console.error('Permission denied: User', user.id, 'tried to download job owned by', job.user_id);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // 2. Use Admin Client to bypass RLS for results fetching (avoids missing results in export)
        const { createClient: createAdminClient } = await import('@supabase/supabase-js');
        const supabaseAdmin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: results, error: fetchError } = await supabaseAdmin
            .from('scraper_results')
            .select('*')
            .eq('job_id', jobId);

        console.log('Results returned from DB:', results?.length || 0);

        if (fetchError) {
            console.error('Database error:', fetchError);
            return NextResponse.json({ error: `Database error: ${fetchError.message}` }, { status: 500 });
        }

        if (!results || results.length === 0) {
            console.error('No results found for job in database:', jobId);
            return NextResponse.json({ error: 'No results found for this job in database' }, { status: 404 });
        }

        // 2. Create Excel Workbook and Worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Leads');

        // Define Columns with Headers - ALL Apify Fields
        worksheet.columns = [
            { header: 'URL', key: 'url', width: 50 },
            { header: 'ID', key: 'kickstarter_id', width: 15 },
            { header: 'Name', key: 'name', width: 40 },
            { header: 'Title', key: 'title', width: 40 },
            { header: 'Blurb', key: 'blurb', width: 50 },
            { header: 'Description', key: 'description', width: 50 },
            { header: 'Slug', key: 'slug', width: 40 },
            { header: 'Goal', key: 'goal', width: 15 },
            { header: 'Pledged', key: 'pledged', width: 15 },
            { header: 'State', key: 'state', width: 12 },
            { header: 'Status', key: 'status', width: 12 },
            { header: 'Country', key: 'country', width: 15 },
            { header: 'Currency', key: 'currency', width: 10 },
            { header: 'Currency Symbol', key: 'currency_symbol', width: 12 },
            { header: 'Deadline', key: 'deadline', width: 20 },
            { header: 'Created At', key: 'created_at', width: 20 },
            { header: 'Launched At', key: 'launched_at', width: 20 },
            { header: 'State Changed At', key: 'state_changed_at', width: 20 },
            { header: 'Successful At', key: 'successful_at', width: 20 },
            { header: 'Backers Count', key: 'backers_count', width: 12 },
            { header: 'Comments Count', key: 'comments_count', width: 12 },
            { header: 'Updates Count', key: 'updates_count', width: 12 },
            { header: 'USD Pledged', key: 'usd_pledged', width: 15 },
            { header: 'Converted Pledged Amount', key: 'converted_pledged_amount', width: 20 },
            { header: 'FX Rate', key: 'fx_rate', width: 12 },
            { header: 'Static USD Rate', key: 'static_usd_rate', width: 15 },
            { header: 'Days to Go', key: 'days_to_go', width: 12 },
            { header: 'Location', key: 'location', width: 30 },
            { header: 'Location Short Name', key: 'location_short_name', width: 20 },
            { header: 'Location State', key: 'location_state', width: 20 },
            { header: 'Location Type', key: 'location_type', width: 15 },
            { header: 'Category', key: 'category', width: 20 },
            { header: 'Category ID', key: 'category_id', width: 15 },
            { header: 'Category Slug', key: 'category_slug', width: 25 },
            { header: 'Parent Category', key: 'parent_category', width: 20 },
            { header: 'Creator', key: 'creator', width: 25 },
            { header: 'Creator ID', key: 'creator_id', width: 15 },
            { header: 'Creator Slug', key: 'creator_slug', width: 25 },
            { header: 'Creator Avatar', key: 'creator_avatar', width: 50 },
            { header: 'Website', key: 'website', width: 50 },
            { header: 'Image URL', key: 'image_url', width: 50 },
            { header: 'Video URL', key: 'video_url', width: 50 },
            { header: 'Staff Pick', key: 'staff_pick', width: 12 },
            { header: 'Spotlight', key: 'spotlight', width: 12 },
        ];

        // 3. Add Data Rows - Safe field access
        results.forEach((row: any) => {
            const safeGet = (field: string, defaultValue: any = '') => {
                return row[field] !== undefined && row[field] !== null ? row[field] : defaultValue;
            };

            const formatDate = (dateField: string) => {
                const val = safeGet(dateField, null);
                return val ? new Date(val).toLocaleString() : '';
            };

            worksheet.addRow({
                url: safeGet('url'),
                kickstarter_id: safeGet('kickstarter_id'),
                name: safeGet('name'),
                title: safeGet('title'),
                blurb: safeGet('blurb'),
                description: safeGet('description'),
                slug: safeGet('slug'),
                goal: safeGet('goal'),
                pledged: safeGet('pledged'),
                state: safeGet('state'),
                status: safeGet('status'),
                country: safeGet('country'),
                currency: safeGet('currency'),
                currency_symbol: safeGet('currency_symbol'),
                deadline: formatDate('deadline'),
                created_at: formatDate('created_at'),
                launched_at: formatDate('launched_at'),
                state_changed_at: formatDate('state_changed_at'),
                successful_at: formatDate('successful_at'),
                backers_count: safeGet('backers_count'),
                comments_count: safeGet('comments_count'),
                updates_count: safeGet('updates_count'),
                usd_pledged: safeGet('usd_pledged'),
                converted_pledged_amount: safeGet('converted_pledged_amount'),
                fx_rate: safeGet('fx_rate'),
                static_usd_rate: safeGet('static_usd_rate'),
                days_to_go: safeGet('days_to_go'),
                location: safeGet('location'),
                location_short_name: safeGet('location_short_name'),
                location_state: safeGet('location_state'),
                location_type: safeGet('location_type'),
                category: safeGet('category'),
                category_id: safeGet('category_id'),
                category_slug: safeGet('category_slug'),
                parent_category: safeGet('parent_category'),
                creator: safeGet('creator'),
                creator_id: safeGet('creator_id'),
                creator_slug: safeGet('creator_slug'),
                creator_avatar: safeGet('creator_avatar'),
                website: safeGet('website'),
                image_url: safeGet('image_url'),
                video_url: safeGet('video_url'),
                staff_pick: safeGet('staff_pick', false) ? 'Yes' : 'No',
                spotlight: safeGet('spotlight', false) ? 'Yes' : 'No',
            });
        });

        // 4. Apply Styling
        // Header Row Styling
        const headerRow = worksheet.getRow(1);
        headerRow.height = 30;
        headerRow.font = {
            name: 'Arial',
            family: 4,
            size: 12,
            bold: true,
            color: { argb: 'FFFFFFFF' } // White text
        };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4CAF50' } // Green background
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

        // Data Rows Styling (Height 30px, Center Alignment)
        worksheet.eachRow((row, rowNumber) => {
            row.height = 30; // Set height for all rows
            row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
            // Optional: wrapText: true for Description if needed, but user asked for center alignment
        });

        // Auto-fit Logic (Basic approximation, ExcelJS doesn't have native auto-fit based on content content width perfectly without specialized calculation)
        // However, we set initial widths above. Let's try to adjust slightly based on content length for better fit if possible.
        worksheet.columns.forEach(column => {
            let maxLength = 0;
            if (column && column.eachCell) {
                column.eachCell({ includeEmpty: true }, (cell) => {
                    const columnLength = cell.value ? String(cell.value).length : 0;
                    if (columnLength > maxLength) {
                        maxLength = columnLength;
                    }
                });
                // Limit max width to avoid overly wide columns
                column.width = Math.min(Math.max(maxLength + 2, 10), 50);
            }
        });

        // Re-apply header width if needed, or trust the loop above.
        // The user specifically asked for "auto fit width". The loop above handles this reasonably well.

        // 5. Generate Buffer
        const buffer = await workbook.xlsx.writeBuffer();

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="leads_${jobId.slice(0, 8)}.xlsx"`,
            },
        });

    } catch (err: any) {
        console.error('Download Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
