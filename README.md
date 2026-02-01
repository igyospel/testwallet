# GruiseWallet - Solana Wallet with Advanced Features

A modern, secure, and feature-rich Solana wallet built with Next.js 15, featuring real-time staking, SPL token management, and portfolio tracking.

![GruiseWallet](public/gillions-logo.png)

## 🚀 Features

### Core Wallet Functionality
- ✅ **HD Wallet Support** - BIP39 mnemonic phrase generation and import
- ✅ **Multiple Accounts** - Create and manage multiple accounts from one seed
- ✅ **Private Key Import** - Import existing wallets via private key
- ✅ **Watch-Only Accounts** - Monitor addresses without private keys
- ✅ **Secure Storage** - AES-256-GCM encryption for sensitive data
- ✅ **Session Management** - Auto-lock with configurable timeout

### Staking Features
- ⚡ **Real-Time Balance Updates** - 5-second refresh interval
- 🎯 **Instant Stake Creation** - Optimistic UI updates
- 📊 **Validator Selection** - Choose from top Solana validators
- 💰 **Rewards Tracking** - Monitor staking rewards in real-time
- 🔄 **Stake Management** - Deactivate and withdraw stakes
- 🚀 **Fast Discovery** - Automatic stake account detection
- 💾 **Smart Caching** - Persistent stake tracking for instant loads

### Token Management
- 🪙 **SPL Token Support** - Full SPL and Token-2022 support
- 💵 **Price Tracking** - Real-time USD prices via Jupiter & DexScreener
- 📈 **Portfolio Value** - Calculate total portfolio worth
- 🎨 **Token Metadata** - Fetch from Raydium, Pump.fun, and on-chain
- 🖼️ **Logo Display** - Automatic token logo fetching
- ⚡ **Parallel Fetching** - Fast multi-source metadata aggregation

### Performance Optimizations
- 🚀 **Alchemy RPC Integration** - Premium Solana RPC endpoint
- ⚡ **Dual Refresh Strategy** - Fast (5s) and full (15s) intervals
- 💾 **Intelligent Caching** - Metadata persistence across sessions
- 🎯 **Optimistic Updates** - Instant UI feedback
- 🔄 **Smart Merging** - Preserve data during updates

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Blockchain**: Solana Web3.js
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Encryption**: Web Crypto API (AES-256-GCM)
- **RPC Provider**: Alchemy

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/igyospel/testwallet.git
cd testwallet

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local and add your Alchemy API key

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the wallet.

## 🔐 Environment Variables

Create a `.env.local` file in the root directory:

```env
# Alchemy Solana RPC API Key
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key_here
```

Get your free Alchemy API key at [https://www.alchemy.com/](https://www.alchemy.com/)

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   │   └── rpc/          # RPC proxy endpoint
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Main page
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── views/            # Main view components
│       ├── OnboardingView.tsx
│       ├── UnlockView.tsx
│       └── DashboardView.tsx
├── core/                  # Core wallet logic
│   ├── security/         # Encryption & storage
│   │   ├── crypto.ts
│   │   ├── session.ts
│   │   └── storage.ts
│   ├── services/         # Blockchain services
│   │   ├── staking.ts
│   │   ├── token.ts
│   │   └── history.ts
│   ├── store/            # State management
│   │   └── walletStore.ts
│   ├── utils/            # Utilities
│   │   └── connection.ts
│   └── wallet/           # Wallet operations
│       └── walletService.ts
└── lib/                   # Shared utilities
    └── utils.ts
```

## 🎯 Key Features Explained

### Real-Time Staking Updates

The wallet implements a dual-refresh strategy:

1. **Fast Path (5s)**: Updates SOL balance and known stake accounts
   - Uses `getMultipleAccountsInfo` for instant balance updates
   - Preserves metadata (rewards, validator info)
   - ~200-500ms response time with Alchemy

2. **Full Scan (15s)**: Comprehensive refresh
   - Discovers new stake accounts
   - Updates all metadata
   - Refreshes token list and prices
   - ~1-2s response time

### Token Price Fetching

Multi-source price aggregation:
- **Primary**: Jupiter Price API (15,000+ tokens)
- **Fallback 1**: DexScreener API (comprehensive coverage)
- **Fallback 2**: On-chain metadata

### Smart Caching System

- **Stake Addresses**: Persistent tracking list for instant loads
- **Token Metadata**: Raydium & Jupiter cache (17,000+ tokens)
- **Account Data**: Encrypted local storage
- **Price Data**: Session-based caching

## 🔒 Security Features

- **AES-256-GCM Encryption**: All sensitive data encrypted at rest
- **PBKDF2 Key Derivation**: 100,000 iterations for password hashing
- **Session Management**: Auto-lock after inactivity
- **No Server Storage**: All data stored locally in browser
- **Secure Random**: Cryptographically secure random number generation

## 📊 Performance Metrics

| Metric | Value |
|--------|-------|
| **Initial Load** | <2s |
| **Balance Update** | 5s interval |
| **Stake Discovery** | <3s (first time) |
| **Token Metadata** | <1s (cached) |
| **Price Fetching** | <2s (parallel) |
| **Transaction Signing** | <500ms |

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Manual Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🧪 Testing

```bash
# Run type checking
npm run type-check

# Run linter
npm run lint

# Build test
npm run build
```

## 📝 Usage Guide

### Creating a New Wallet

1. Click "Create New Wallet"
2. Set a strong password
3. **IMPORTANT**: Write down your 12-word recovery phrase
4. Confirm the recovery phrase
5. Your wallet is ready!

### Importing an Existing Wallet

**Via Mnemonic:**
1. Click "Import Wallet"
2. Enter your 12-word recovery phrase
3. Set a password
4. Done!

**Via Private Key:**
1. Unlock your wallet
2. Click "Add Account" → "Import Private Key"
3. Paste your private key
4. Account imported!

### Staking SOL

1. Go to "Staking" tab
2. Click "Stake SOL"
3. Enter amount to stake
4. Select a validator
5. Confirm transaction
6. Balance updates instantly!

### Managing Tokens

- **View Tokens**: Automatically displayed on dashboard
- **Token Prices**: Real-time USD values
- **Portfolio Value**: Total worth calculated automatically

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see LICENSE file for details

## ⚠️ Disclaimer

This wallet is for educational and testing purposes. Always verify transactions and never share your private keys or recovery phrase. Use at your own risk.

## 🔗 Links

- **GitHub**: [https://github.com/igyospel/testwallet](https://github.com/igyospel/testwallet)
- **Solana Docs**: [https://docs.solana.com/](https://docs.solana.com/)
- **Alchemy**: [https://www.alchemy.com/](https://www.alchemy.com/)

## 💡 Support

For issues and questions, please open an issue on GitHub.

---

**Built with ❤️ for the Solana ecosystem**
