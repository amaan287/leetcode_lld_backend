import { connectDatabase, getDatabase, disconnectDatabase } from '../src/config/database';
import type { LLDQuestion } from '../src/models/LLDQuestion';
import { readFile, readdir, stat } from 'fs/promises';
import { join, resolve } from 'path';

interface RepoQuestion {
  title: string;
  description: string;
  scenario: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

/**
 * Parse README.md file to extract question details
 */
async function parseReadme(readmePath: string, folderName: string): Promise<RepoQuestion | null> {
  try {
    const content = await readFile(readmePath, 'utf-8');
    
    // Extract title from folder name (clean it up)
    const title = folderName
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .trim();

    // Extract description and scenario from README
    // Look for common patterns in README files
    let description = '';
    let scenario = '';
    
    // Try to find problem statement section
    const problemStatementMatch = content.match(/#+\s*PROBLEM\s*STATEMENT[:\s]*\n\n?(.*?)(?=\n#|\n##|$)/is);
    if (problemStatementMatch) {
      scenario = problemStatementMatch[1].trim();
    }
    
    // Try to find description section
    const descriptionMatch = content.match(/(?:Description|Problem)[:\s]*\n\n?(.*?)(?=\n##|\n#|Features:|Requirements:|$)/is);
    if (descriptionMatch) {
      description = descriptionMatch[1].trim();
    }
    
    // If no specific sections found, use first few paragraphs
    if (!description && !scenario) {
      const lines = content.split('\n').filter(line => line.trim());
      // Skip title lines (starting with #)
      const contentLines = lines.filter(line => !line.trim().startsWith('#'));
      const firstParagraphs = contentLines.slice(0, 10).join('\n');
      description = firstParagraphs.substring(0, 500); // Limit to 500 chars
      scenario = firstParagraphs.substring(500, 1000) || description;
    }
    
    // Infer category from folder name or content
    let category = 'General';
    const categoryKeywords: Record<string, string> = {
      'parking': 'System Design',
      'food': 'E-commerce',
      'restaurant': 'E-commerce',
      'stock': 'Trading',
      'exchange': 'Trading',
      'cricket': 'Sports',
      'match': 'Sports',
      'event': 'Calendar',
      'calendar': 'Calendar',
      'property': 'Real Estate',
      'ride': 'Transportation',
      'sharing': 'Transportation',
      'cache': 'System Design',
      'calculator': 'Utilities',
      'election': 'Voting',
      'ledger': 'Finance',
      'jira': 'Project Management',
    };
    
    const lowerFolder = folderName.toLowerCase();
    for (const [keyword, cat] of Object.entries(categoryKeywords)) {
      if (lowerFolder.includes(keyword)) {
        category = cat;
        break;
      }
    }
    
    // Infer difficulty (default to Medium, can be adjusted)
    let difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium';
    
    // Check for difficulty indicators in content
    const contentLower = content.toLowerCase();
    if (contentLower.includes('easy') || contentLower.includes('simple')) {
      difficulty = 'Easy';
    } else if (contentLower.includes('hard') || contentLower.includes('complex') || contentLower.includes('advanced')) {
      difficulty = 'Hard';
    }
    
    // Ensure we have at least some content
    if (!description && !scenario) {
      description = `Design a system for ${title}`;
      scenario = content.substring(0, 500);
    }
    
    return {
      title,
      description: description || `Design a system for ${title}`,
      scenario: scenario || description || `Design and implement a system for ${title}. Consider scalability, maintainability, and following SOLID principles.`,
      category,
      difficulty,
    };
  } catch (error) {
    console.error(`Error parsing ${readmePath}:`, error);
    return null;
  }
}

/**
 * Recursively find all README.md files in a directory
 */
async function findReadmeFiles(dir: string, baseDir: string): Promise<Array<{ path: string; folderName: string }>> {
  const results: Array<{ path: string; folderName: string }> = [];
  
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip .git and other hidden/system directories
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'out') {
          // Check if this directory has a README.md
          const readmePath = join(fullPath, 'README.md');
          try {
            await readFile(readmePath, 'utf-8');
            const folderName = entry.name;
            results.push({ path: readmePath, folderName });
          } catch {
            // No README.md in this directory, recurse deeper
            const subResults = await findReadmeFiles(fullPath, baseDir);
            results.push(...subResults);
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  
  return results;
}

/**
 * Import LLD questions from repository
 */
async function importLLDQuestions(repoPath: string) {
  try {
    // Resolve to absolute path
    const absolutePath = resolve(repoPath);
    console.log('Starting LLD import from:', absolutePath);
    
    // Check if path exists
    try {
      const stats = await stat(absolutePath);
      if (!stats.isDirectory()) {
        throw new Error(`Path is not a directory: ${absolutePath}`);
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`Directory not found: ${absolutePath}`);
      }
      throw error;
    }
    
    // Find all README files
    const readmeFiles = await findReadmeFiles(absolutePath, absolutePath);
    console.log(`Found ${readmeFiles.length} README files`);
    
    // Parse all README files
    const questions: RepoQuestion[] = [];
    for (const { path, folderName } of readmeFiles) {
      const question = await parseReadme(path, folderName);
      if (question) {
        questions.push(question);
        console.log(`Parsed: ${question.title}`);
      }
    }
    
    console.log(`\nParsed ${questions.length} questions`);
    
    // Connect to database
    await connectDatabase();
    const db = getDatabase();
    const collection = db.collection<LLDQuestion>('lld_questions');
    
    // Check for duplicates and insert
    let inserted = 0;
    let skipped = 0;
    
    for (const question of questions) {
      // Check if question with same title already exists
      const existing = await collection.findOne({ title: question.title });
      
      if (existing) {
        console.log(`Skipping duplicate: ${question.title}`);
        skipped++;
      } else {
        await collection.insertOne({
          ...question,
          createdAt: new Date(),
        } as LLDQuestion);
        console.log(`Inserted: ${question.title}`);
        inserted++;
      }
    }
    
    console.log(`\nImport complete!`);
    console.log(`- Inserted: ${inserted}`);
    console.log(`- Skipped (duplicates): ${skipped}`);
    console.log(`- Total: ${questions.length}`);
    
    // Close database connection
    await disconnectDatabase();
    
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
}

// Run the import if this script is executed directly
if (require.main === module) {
  const repoPath = process.argv[2] || '/tmp/LLD_repo';
  
  importLLDQuestions(repoPath)
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { importLLDQuestions };

