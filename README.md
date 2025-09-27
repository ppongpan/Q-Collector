# 📋 Q-Collector

> **ระบบสร้างฟอร์มบันทึกข้อมูล Q-CON พร้อม iOS 26 glass morphism design, 60fps animations และระบบฟิลด์ครบครัน**

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/your-username/Q-Collector)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.0+-38B2AC.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## ✨ Features

### 🎨 **Premium Design System**
- **iOS 26 Liquid Glass**: Premium glass morphism interface with backdrop blur effects
- **Dark/Light Themes**: Seamless theme switching with black-orange color palette
- **60fps Animations**: Hardware-accelerated Framer Motion animations
- **Touch Optimized**: 44px minimum touch targets with gesture support

### 📋 **Comprehensive Form Builder**
- **17 Field Types**: Complete coverage from basic inputs to advanced components
- **Dynamic Preview**: Real-time form preview with glass morphism styling
- **Sub Forms**: Nested form management with independent field configuration
- **Role-Based Access**: Visual role tags with customizable permissions
- **Telegram Integration**: Automatic notifications with configurable fields

### 🌐 **Thai Business Context**
- **GPS Location Fields**: Latitude/longitude with current position detection
- **Thai Provinces**: Complete 77-province dropdown selector
- **Factory Selection**: Pre-defined business location options
- **Document Numbering**: Automatic Thai business document generation

### 📱 **Responsive Excellence**
- **Mobile-First**: Optimized for all screen sizes (320px to 4K)
- **Cross-Platform**: Consistent experience across desktop, tablet, mobile
- **Accessibility**: WCAG 2.1 AA compliance with screen reader support

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/Q-Collector.git
cd Q-Collector

# Install dependencies
npm install

# Start development server
npm start
```

Visit `http://localhost:3000` to see the application.

### Production Build

```bash
# Create production build
npm run build

# Serve production build locally
npx serve -s build
```

## 🏗️ Architecture

### Core Technologies
- **React 18**: Modern React with Hooks and Concurrent Features
- **TailwindCSS**: Utility-first styling with custom glass components
- **Framer Motion**: 60fps animations with hardware acceleration
- **ShadCN UI**: High-quality component library integration

### Project Structure

```
src/
├── components/
│   ├── MainFormApp.jsx              # Main application entry
│   ├── EnhancedFormBuilder.jsx      # Form builder interface
│   ├── FormView.jsx                 # Form data input view
│   └── ui/                          # Glass UI component library
├── contexts/                        # React contexts (Theme, Font)
├── hooks/                          # Custom React hooks
├── lib/                            # Utility functions and animations
└── styles/                         # CSS and animation styles
```

## 📋 Field Types

### Basic Fields
- `short_answer` - Single-line text input
- `paragraph` - Multi-line textarea
- `email` - Email validation
- `phone` - Phone number input
- `number` - Numeric input
- `url` - URL validation

### Media Fields
- `file_upload` - File attachments
- `image_upload` - Image uploads with preview

### Date/Time Fields
- `date` - Date picker
- `time` - Time selector
- `datetime` - Combined date/time picker

### Interactive Fields
- `multiple_choice` - Radio/checkbox/dropdown options
- `rating` - Star rating system
- `slider` - Range slider input

### Location Fields
- `lat_long` - GPS coordinates with current location
- `province` - Thai provinces (77 provinces)
- `factory` - Business location selector

## 🎨 Design System

### Glass Morphism Components
- **GlassCard**: Premium glass containers with backdrop blur
- **GlassButton**: Interactive buttons with hover animations
- **GlassInput**: Form inputs with glass styling
- **GlassNav**: Navigation with glass effects

### Color Palette
```css
/* Primary Colors */
--primary-black: #0a0a0a
--primary-orange: #f97316

/* Glass Effects */
backdrop-filter: blur(12px)
background: rgba(255, 255, 255, 0.1)
border: 1px solid rgba(255, 255, 255, 0.2)
```

### Animation System
- **Page Transitions**: 400ms smooth transitions
- **Component Animations**: 250ms interactive feedback
- **Micro-interactions**: 150ms instant response

## 🔧 Configuration

### Environment Variables
```bash
# .env
PORT=3001
REACT_APP_VERSION=0.1.0
```

### Custom Settings
- **Theme Preferences**: Automatic dark/light mode detection
- **Font Scaling**: Customizable typography scales
- **Animation Preferences**: Reduced motion support

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run Playwright e2e tests
npx playwright test
```

## 📦 Deployment

### Production Deployment
```bash
# Build for production
npm run build

# Deploy to your preferred platform
# (Vercel, Netlify, AWS, etc.)
```

### Docker Support
```bash
# Build Docker image
docker build -t form-builder .

# Run container
docker run -p 3000:3000 form-builder
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Design Inspiration**: iOS 26 glass morphism principles
- **UI Components**: ShadCN UI component library
- **Animations**: Framer Motion animation system
- **Thai Fonts**: ThaiSans Neue typography family

## 📊 Q-Collector Stats

- **Lines of Code**: 42,000+
- **Components**: 50+ custom components
- **Field Types**: 17 comprehensive types
- **Languages**: JavaScript (React), CSS, HTML
- **Bundle Size**: Optimized for production (<2MB gzipped)

## 🔮 Roadmap

### v0.2.0 (Coming Soon)
- [ ] Advanced form validation rules
- [ ] Export/import form templates
- [ ] Advanced analytics dashboard
- [ ] Multi-language support

### v0.3.0 (Future)
- [ ] Real-time collaboration
- [ ] Advanced conditional logic
- [ ] Integration marketplace
- [ ] Mobile app companion

---

<div align="center">

**Built with ❤️ using [Claude Code](https://claude.ai/code)**

[⭐ Star this project](https://github.com/your-username/Q-Collector) | [🐛 Report Issues](https://github.com/your-username/Q-Collector/issues) | [💡 Request Features](https://github.com/your-username/Q-Collector/issues/new)

</div>