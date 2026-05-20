# claude-tdd

TDD-first CLI that reads a test file and asks Claude (Anthropic) to generate the implementation.

## Install

```bash
npm install -g claude-tdd
```

Or use locally with Bun:

```bash
bun install
bun run build
```

## Configuration

Set your API key:

```bash
export ANTHROPIC_API_KEY=...
```

See `.env.example` for reference.

## Usage

```bash
claude-tdd <test-file> [options]
```

Options:

- `--out <path>` explicit output path
- `--model <id>` model id (`opus`, `sonnet`, `haiku` aliases supported)
- `--context <path>` extra context file (repeatable)
- `--iterate` run `bun test <test-file>` and retry on failures
- `--max-attempts <n>` max retries with iterate mode (default: 3)
- `--dry-run` print code only (no file write)
- `--silent` suppress stream output
- `--api-key <key>` override env key
- `--help` / `-h`
- `--version` / `-v`

Exit codes:

- `0` success
- `1` usage error
- `2` file/IO error
- `3` Anthropic API error
- `4` iterate attempts exhausted

## Build

```bash
bun run build
bun run build:compile
```

## Examples

- `examples/sum.test.ts`
- `examples/fetch.test.ts`
