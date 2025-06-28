// Quick syntax test for main files
try {
  const fs = require('fs');
  const path = require('path');
  
  // Test key files
  const filesToTest = [
    './src/App.js',
    './src/LoginScreen.jsx',
    './src/RichTextEditor.jsx',
    './src/hooks/useAuth.js'
  ];
  
  filesToTest.forEach(file => {
    try {
      const code = fs.readFileSync(file, 'utf8');
      // Basic syntax check - look for common issues
      
      // Check for unmatched brackets
      const openBraces = (code.match(/\{/g) || []).length;
      const closeBraces = (code.match(/\}/g) || []).length;
      const openParens = (code.match(/\(/g) || []).length;
      const closeParens = (code.match(/\)/g) || []).length;
      const openBrackets = (code.match(/\[/g) || []).length;
      const closeBrackets = (code.match(/\]/g) || []).length;
      
      console.log(`${file}:`);
      console.log(`  Braces: ${openBraces} open, ${closeBraces} close ${openBraces === closeBraces ? '✓' : '✗'}`);
      console.log(`  Parentheses: ${openParens} open, ${closeParens} close ${openParens === closeParens ? '✓' : '✗'}`);
      console.log(`  Brackets: ${openBrackets} open, ${closeBrackets} close ${openBrackets === closeBrackets ? '✓' : '✗'}`);
      
      // Check for obvious syntax errors
      const hasUnterminatedString = /(['"`])[^'"`]*$/.test(code.replace(/\\['"`]/g, ''));
      if (hasUnterminatedString) {
        console.log(`  ✗ Possible unterminated string`);
      }
      
      console.log('');
    } catch (err) {
      console.error(`Error reading ${file}:`, err.message);
    }
  });
  
  console.log('Syntax check complete. Look for any ✗ markers above.');
  
} catch (error) {
  console.error('Test failed:', error);
}