# 🛡️ GruiseWallet - Ultra-Secure Solana Wallet

**Maximum Security. Non-Custodial. Production-Grade.**

GruiseWallet is a production-ready, non-custodial Solana Web3 wallet built with maximum client-side security as the top priority. It implements industry-grade cryptographic standards used by top crypto wallets.

![GruiseWallet](https://img.shields.io/badge/Security-Maximum-brightgreen) ![Solana](https://img.shields.io/badge/Blockchain-Solana-blueviolet) ![License](https://img.shields.io/badge/License-MIT-blue)

## 🔐 Security Features

### Cryptography & Key Management
- ✅ **BIP-39 Mnemonic**: 24-word seed phrase generation using secure Web Crypto API entropy
- ✅ **BIP-44 Derivation**: Standard Solana derivation path (`m/44'/501'/0'/0'`)
- ✅ **AES-256-GCM Encryption**: Military-grade encryption for private keys
- ✅ **Argon2id Key Derivation**: Memory-hard password hashing (64MB, 4 iterations)
- ✅ **IndexedDB Storage**: Encrypted vault storage (never plaintext)
- ✅ **No LocalStorage**: Secrets never stored in localStorage

### Authentication & Access Control
- ✅ **Password Protection**: Minimum 8-character password requirement
- ✅ **Auto-Lock**: Automatic wallet lock after 5 minutes of inactivity
- ✅ **Manual Lock**: One-click wallet locking
- ✅ **Session Management**: In-memory key caching with automatic cleanup

### Seed Phrase Safety
- ✅ **One-Time Display**: Seed phrase shown only once during creation
- ✅ **Word Verification**: Users must confirm seed phrase in correct order
- ✅ **Memory Clearing**: Sensitive data cleared from memory immediately
- ✅ **No Re-Display**: Seed phrase cannot be shown again after confirmation
- ✅ **Explicit Warnings**: Clear "lost phrase = lost funds" messaging

### Application Security
- ✅ **Client-Side Only**: No backend custody or transmission
- ✅ **No Analytics**: No tracking of sensitive flows
- ✅ **Modular Crypto Logic**: Isolated, auditable security code
- ✅ **TypeScript**: Type-safe implementation

## 🎨 UI/UX Features

- 🌙 **Premium Dark Mode**: Exodus-inspired design
- ✨ **Glassmorphism**: Modern glass-effect cards
- 🎯 **Clear Security Indicators**: Lock status, network status
- 🔔 **Visual Confirmations**: Feedback on all sensitive actions
- 📱 **Responsive Design**: Works on all screen sizes

## 🚀 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: TailwindCSS 4
- **Web3**: @solana/web3.js
- **Cryptography**: 
  - Web Crypto API
  - hash-wasm (Argon2id)
  - AES-256-GCM
- **State Management**: Zustand
- **Storage**: IndexedDB (via idb)
- **Icons**: Lucide React

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/GruiseWallet.git
cd GruiseWallet

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

## 🔧 Configuration

The wallet is configured to use **Solana Devnet** by default for safety during testing. To switch networks, modify the connection in `src/core/store/walletStore.ts`:

```typescript
// For Mainnet (USE WITH CAUTION)
const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');

// For Devnet (Safe for testing)
const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
```

## 🛠️ Development

```bash
# Run development server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Build
npm run build
```

## 🔒 Security Best Practices

### For Users
1. **Never share your seed phrase** with anyone
2. **Write down your seed phrase** on paper and store it safely
3. **Use a strong password** (12+ characters recommended)
4. **Verify the URL** before entering sensitive information
5. **Lock your wallet** when not in use

### For Developers
1. All cryptographic operations are isolated in `src/core/security/`
2. Never log sensitive information (keys, passwords, seed phrases)
3. Always clear sensitive data from memory after use
4. Use the provided `CryptoService` for all encryption/decryption
5. Never store unencrypted secrets

## 📁 Project Structure

```
GruiseWallet/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── page.tsx           # Main orchestrator
│   │   ├── layout.tsx         # Root layout
│   │   └── globals.css        # Global styles
│   ├── components/
│   │   ├── ui/                # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Card.tsx
│   │   └── views/             # Main application views
│   │       ├── OnboardingView.tsx
│   │       ├── UnlockView.tsx
│   │       └── DashboardView.tsx
│   ├── core/
│   │   ├── security/          # Security & cryptography
│   │   │   ├── crypto.ts      # AES-256-GCM + Argon2id
│   │   │   ├── storage.ts     # IndexedDB wrapper
│   │   │   └── session.ts     # Session management
│   │   ├── wallet/            # Wallet logic
│   │   │   └── walletService.ts
│   │   └── store/             # State management
│   │       └── walletStore.ts
│   └── lib/
│       └── utils.ts           # Utility functions
├── public/                    # Static assets
└── package.json
```

## 🚫 Strict Prohibitions

- ❌ NO backend custody
- ❌ NO private key transmission
- ❌ NO analytics tracking of sensitive flows
- ❌ NO seed phrase recovery via server
- ❌ NO silent approvals
- ❌ NO plaintext storage of secrets

## 🧪 Testing

**IMPORTANT**: This wallet is configured for Devnet by default. Always test thoroughly before using with real funds.

1. Create a new wallet
2. Save the 24-word seed phrase
3. Verify the seed phrase by selecting words in order
4. Test lock/unlock functionality
5. Check balance on Solana Explorer (Devnet)

## 🔮 Roadmap

- [ ] WalletConnect v2 integration
- [ ] Send/Receive transactions
- [ ] Token support (SPL tokens)
- [ ] Transaction history
- [ ] Multiple accounts
- [ ] Hardware wallet support
- [ ] Biometric unlock (WebAuthn)
- [ ] Import existing wallet
- [ ] Network switching UI

## 📄 License

MIT License - see LICENSE file for details

## ⚠️ Disclaimer

This software is provided "as is", without warranty of any kind. Use at your own risk. Always verify the code before using with real funds. The developers are not responsible for any loss of funds.

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review the code in `src/core/security/` for security implementation details

---

**Built with ❤️ for the Solana ecosystem**

*GruiseWallet - Your keys, your crypto, your control.*
