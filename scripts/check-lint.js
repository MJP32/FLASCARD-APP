const { execSync } = require('child_process');
const fs = require('fs');

try {
  const result = execSync('npx eslint src/App.js src/RichTextEditor.jsx src/components/FlashcardForm.jsx src/components/StudyGuideModal.jsx --format=json', { encoding: 'utf8' });
  const lintResults = JSON.parse(result);
  
  // Write to file for detailed analysis
  fs.writeFileSync('lint-results.json', JSON.stringify(lintResults, null, 2));
  
  console.log('=== LINT RESULTS ===');
  lintResults.forEach(file => {
    if (file.messages.length > 0) {
      console.log(`\nFile: ${file.filePath.replace(/.*[\\\/]/, '')}`);
      file.messages.forEach(msg => {
        console.log(`  Line ${msg.line}:${msg.column} - ${msg.severity === 2 ? 'ERROR' : 'WARNING'}: ${msg.message}`);
        console.log(`    Rule: ${msg.ruleId}`);
      });
    }
  });
  
  const totalErrors = lintResults.reduce((sum, file) => sum + file.errorCount, 0);
  const totalWarnings = lintResults.reduce((sum, file) => sum + file.warningCount, 0);
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`Total Errors: ${totalErrors}`);
  console.log(`Total Warnings: ${totalWarnings}`);
  
} catch (error) {
  console.error('Error running lint check:', error.message);
}
