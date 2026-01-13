# LLD Import Script

This script imports Low Level Design questions from the [kumaransg/LLD](https://github.com/kumaransg/LLD) repository into your MongoDB collection.

## Prerequisites

1. Clone the LLD repository locally:
   ```bash
   git clone https://github.com/kumaransg/LLD.git /tmp/LLD_repo
   ```

   Or clone it to any location you prefer.

2. Make sure your MongoDB is running and the connection string is set in your `.env` file.

## Usage

### Option 1: Using npm script (recommended)

```bash
cd backend
bun run import:lld /path/to/LLD_repo
```

If you cloned to `/tmp/LLD_repo`:
```bash
bun run import:lld /tmp/LLD_repo
```

### Option 2: Run directly with Bun

```bash
cd backend
bun run scripts/importLLD.ts /path/to/LLD_repo
```

## What the script does

1. **Scans the repository**: Recursively finds all `README.md` files in the repository
2. **Parses questions**: Extracts title, description, scenario, category, and difficulty from each README
3. **Maps to your schema**: Converts the data to match your `LLDQuestion` model:
   - `title`: Extracted from folder name
   - `description`: Extracted from README content
   - `scenario`: Problem statement from README
   - `category`: Inferred from folder name (e.g., "parking" → "System Design")
   - `difficulty`: Inferred from content or defaults to "Medium"
4. **Imports to MongoDB**: Inserts questions into the `lld_questions` collection, skipping duplicates

## Example Output

```
Starting LLD import from: /tmp/LLD_repo
Found 45 README files
Parsed: Parking Lot Lld Oop Ood
Parsed: Food Kart
Parsed: Stock Exchange
...

Parsed 45 questions

Inserted: Parking Lot Lld Oop Ood
Inserted: Food Kart
...

Import complete!
- Inserted: 45
- Skipped (duplicates): 0
- Total: 45
```

## Notes

- The script skips duplicate questions (based on title)
- Categories are automatically inferred from folder names
- Difficulty defaults to "Medium" but can be inferred from content
- If a README doesn't have clear sections, it uses the first paragraphs as description/scenario

## Troubleshooting

If you encounter issues:

1. **MongoDB connection error**: Make sure your `.env` file has the correct `MONGODB_URI`
2. **File not found**: Check that the repository path is correct
3. **Permission errors**: Make sure you have read access to the repository directory

