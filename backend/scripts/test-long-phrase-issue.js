/**
 * Test Long Phrase Transliteration Issue
 *
 * Purpose: Investigate why very long Thai phrases are being transliterated
 * Problem: "แบบฟอร์มบันทึกข้อมูลการจัดการความเสี่ยงและการป้องกันอุบัติเหตุในสถานประกอบการ"
 *          → "form_aebbformbanthuekkhomulkarchadkarkhwamesiyngaelakar"
 *
 * Expected: Proper English translation like "risk_management_accident_prevention_form"
 *
 * Date: 2025-10-10
 * Version: v0.7.7-dev (Debug)
 */

const tableNameHelper = require('../utils/tableNameHelper');
const myMemoryService = require('../services/MyMemoryTranslationService');

async function testLongPhraseIssue() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 Investigating Long Phrase Transliteration Issue');
  console.log('='.repeat(80));

  const problematicPhrase = 'แบบฟอร์มบันทึกข้อมูลการจัดการความเสี่ยงและการป้องกันอุบัติเหตุในสถานประกอบการ';

  console.log(`\n📝 Testing Phrase:`);
  console.log(`   Thai: ${problematicPhrase}`);
  console.log(`   Length: ${problematicPhrase.length} characters\n`);

  // Step 1: Test direct MyMemory API call
  console.log('─'.repeat(80));
  console.log('Step 1: Direct MyMemory API Call (with rejectTransliteration)');
  console.log('─'.repeat(80));

  try {
    const directResult = await myMemoryService.translateToEnglish(problematicPhrase, {
      context: 'form',
      minQuality: 0.5,
      rejectTransliteration: true
    });

    console.log(`✅ MyMemory API Response:`);
    console.log(`   Translation: "${directResult.translation}"`);
    console.log(`   Slug: "${directResult.slug}"`);
    console.log(`   Quality: ${directResult.quality} (${directResult.qualityLabel})`);
    console.log(`   Source: ${directResult.source}`);
    console.log(`   Transliteration Detected: ${directResult.isTransliteration || false}`);
    console.log(`   Was Rejected: ${directResult.rejected || false}\n`);
  } catch (error) {
    console.log(`❌ MyMemory API Error: ${error.message}\n`);
  }

  // Step 2: Test through tableNameHelper.sanitizeIdentifier
  console.log('─'.repeat(80));
  console.log('Step 2: Through tableNameHelper.sanitizeIdentifier()');
  console.log('─'.repeat(80));

  try {
    const sanitizedResult = await tableNameHelper.sanitizeIdentifier(
      problematicPhrase,
      'form'
    );

    console.log(`✅ Final Table Name: "${sanitizedResult}"`);

    // Check if result is transliteration
    const hasLongConsonantCluster = /[bcdfghjklmnpqrstvwxyz]{8,}/i.test(sanitizedResult);
    const hasRepeatingPattern = /(.{3,})\1/.test(sanitizedResult);
    const hasThaiPhonetics = /ae|kh|ph|th|ng|aep|bant|khom|ying/.test(sanitizedResult);
    const isHash = /^_[a-z0-9]{6}$/.test(sanitizedResult);

    console.log(`\n🔍 Transliteration Analysis:`);
    console.log(`   Is Hash-Only: ${isHash}`);
    console.log(`   Has Long Consonant Cluster (8+): ${hasLongConsonantCluster}`);
    console.log(`   Has Repeating Pattern: ${hasRepeatingPattern}`);
    console.log(`   Has Thai Phonetics (ae/kh/ph/th/ng): ${hasThaiPhonetics}`);
    console.log(`   Length vs Original: ${sanitizedResult.length} vs ${problematicPhrase.length}`);

    if (hasThaiPhonetics || hasLongConsonantCluster) {
      console.log(`\n❌ VERDICT: This is a TRANSLITERATION, not proper English!`);
    } else {
      console.log(`\n✅ VERDICT: This appears to be proper English translation`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
  }

  // Step 3: Test chunking strategy (break into smaller parts)
  console.log('\n' + '─'.repeat(80));
  console.log('Step 3: Testing Chunking Strategy (Break into Smaller Parts)');
  console.log('─'.repeat(80));

  // Manual breakdown of the phrase
  const chunks = [
    'แบบฟอร์ม',  // Form
    'บันทึกข้อมูล',  // Data record
    'การจัดการความเสี่ยง',  // Risk management
    'การป้องกันอุบัติเหตุ',  // Accident prevention
    'ในสถานประกอบการ'  // In establishment
  ];

  console.log(`\n📦 Breaking phrase into ${chunks.length} chunks:\n`);

  const chunkResults = [];
  for (const chunk of chunks) {
    try {
      const result = await myMemoryService.translateToEnglish(chunk, {
        context: 'general',
        minQuality: 0.5,
        rejectTransliteration: true
      });

      chunkResults.push(result.slug);
      console.log(`   "${chunk}" → "${result.slug}" (quality: ${result.quality})`);

      // Wait 200ms to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.log(`   "${chunk}" → ERROR: ${error.message}`);
      chunkResults.push('unknown');
    }
  }

  const combinedSlug = chunkResults.join('_');
  console.log(`\n✅ Combined Slug: "${combinedSlug}"`);
  console.log(`   Length: ${combinedSlug.length} characters`);

  // Step 4: Alternative - translate to English first, then slugify
  console.log('\n' + '─'.repeat(80));
  console.log('Step 4: Testing Full Translation (No Slug, Just English)');
  console.log('─'.repeat(80));

  try {
    // Call MyMemory without slug conversion
    const axios = require('axios');
    const response = await axios.get('https://api.mymemory.translated.net/get', {
      params: {
        q: problematicPhrase,
        langpair: 'th|en'
      },
      timeout: 10000
    });

    if (response.data && response.data.responseData) {
      const rawTranslation = response.data.responseData.translatedText;
      const quality = response.data.responseData.match || 0;

      console.log(`\n✅ Raw MyMemory Response:`);
      console.log(`   Translation: "${rawTranslation}"`);
      console.log(`   Quality: ${quality}\n`);

      // Manually slugify the English translation
      const manualSlug = rawTranslation
        .toLowerCase()
        .replace(/[^a-z0-9\s_-]/g, '')
        .replace(/[-\s]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .substring(0, 63);

      console.log(`   Manual Slug: "${manualSlug}"`);
      console.log(`   Is this better than: "form_aebbformbanthuekkhomulkarchadkarkhwamesiyngaelakar"?\n`);
    }
  } catch (error) {
    console.log(`❌ Raw API Error: ${error.message}\n`);
  }

  console.log('='.repeat(80));
  console.log('🏁 Investigation Complete');
  console.log('='.repeat(80) + '\n');
}

// Run investigation
testLongPhraseIssue()
  .then(() => {
    console.log('Investigation completed\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('Investigation failed:', error);
    process.exit(1);
  });
