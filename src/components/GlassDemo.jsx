import React, { useState } from 'react';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription, GlassCardContent, GlassCardFooter } from './ui/glass-card';
import { GlassButton } from './ui/glass-button';
import { GlassInput, GlassTextarea, GlassSelect } from './ui/glass-input';
import { GlassNavigation, GlassNavBrand, GlassNavMenu, GlassNavItem, GlassNavIcon } from './ui/glass-nav';
import GlassTooltip from './ui/glass-tooltip';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSparkles,
  faLayerGroup,
  faMagicWandSparkles,
  faGem,
  faPalette,
  faEye,
  faHeart,
  faRocket,
  faCrown,
  faFire
} from '@fortawesome/free-solid-svg-icons';

const GlassDemo = () => {
  const [activeDemo, setActiveDemo] = useState('components');

  return (
    <div className="min-h-screen bg-background transition-all duration-500 overflow-hidden">
      {/* iOS 26 Liquid Glass Background Effects */}
      <div className="fixed inset-0 -z-10">
        {/* Dynamic Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-primary/5 animate-glow"></div>

        {/* Floating Glass Orbs */}
        <div className="absolute top-20 left-20 w-64 h-64 glass-container rounded-full animate-float opacity-30 blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 glass-primary rounded-full animate-float opacity-20 blur-3xl" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/3 right-1/3 w-48 h-48 glass-elevated rounded-full animate-float opacity-25 blur-2xl" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-1/3 left-1/3 w-32 h-32 bg-accent/20 rounded-full animate-float opacity-30 blur-xl" style={{ animationDelay: '3s' }}></div>

        {/* Specular Light Effects */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-glass-specular-medium to-transparent opacity-80"></div>
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-glass-specular-light to-transparent opacity-60"></div>
      </div>

      {/* Glass Navigation */}
      <GlassNavigation className="px-6 py-4">
        <GlassNavBrand>
          <div className="w-12 h-12 glass-primary rounded-xl flex items-center justify-center animate-float shadow-glass-floating">
            <FontAwesomeIcon icon={faSparkles} className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-glow">
            iOS 26 Liquid Glass
          </div>
        </GlassNavBrand>

        <GlassNavMenu>
          <GlassNavItem
            active={activeDemo === 'components'}
            tooltip="Components Showcase"
            onClick={() => setActiveDemo('components')}
          >
            <FontAwesomeIcon icon={faLayerGroup} className="w-4 h-4" />
            Components
          </GlassNavItem>
          <GlassNavItem
            active={activeDemo === 'forms'}
            tooltip="Glass Form Elements"
            onClick={() => setActiveDemo('forms')}
          >
            <FontAwesomeIcon icon={faPalette} className="w-4 h-4" />
            Forms
          </GlassNavItem>
          <GlassNavItem
            active={activeDemo === 'effects'}
            tooltip="Visual Effects"
            onClick={() => setActiveDemo('effects')}
          >
            <FontAwesomeIcon icon={faMagicWandSparkles} className="w-4 h-4" />
            Effects
          </GlassNavItem>
        </GlassNavMenu>
      </GlassNavigation>

      {/* Main Content */}
      <div className="container-glass max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-4 animate-glow">
            iOS 26 Liquid Glass
          </h1>
          <p className="text-xl text-foreground/80 mb-8 max-w-2xl mx-auto">
            Experience the future of interface design with translucent materials, dynamic lighting, and specular highlights.
          </p>
        </div>

        {activeDemo === 'components' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Glass Cards Demo */}
            <GlassCard variant="base" className="animate-glass-in">
              <GlassCardHeader>
                <GlassCardTitle>
                  <FontAwesomeIcon icon={faGem} className="w-5 h-5 mr-2 text-primary" />
                  Base Glass Card
                </GlassCardTitle>
                <GlassCardDescription minimal>
                  Standard translucent container with backdrop blur and subtle borders.
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                <p className="text-sm text-foreground/70">
                  Beautiful glass morphism with iOS 26 design principles.
                </p>
              </GlassCardContent>
              <GlassCardFooter>
                <GlassButton variant="primary" tooltip="Primary Action">
                  <FontAwesomeIcon icon={faRocket} className="w-4 h-4 mr-2" />
                  Launch
                </GlassButton>
                <GlassButton variant="ghost" tooltip="Secondary Action">
                  Details
                </GlassButton>
              </GlassCardFooter>
            </GlassCard>

            <GlassCard variant="elevated" className="animate-glass-in" style={{ animationDelay: '0.1s' }}>
              <GlassCardHeader>
                <GlassCardTitle>
                  <FontAwesomeIcon icon={faLayerGroup} className="w-5 h-5 mr-2 text-accent" />
                  Elevated Glass
                </GlassCardTitle>
                <GlassCardDescription>
                  Enhanced depth with increased blur and elevation shadows.
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="space-y-3">
                  <div className="w-full h-2 glass-container rounded-full overflow-hidden">
                    <div className="w-3/4 h-full glass-primary rounded-full"></div>
                  </div>
                  <p className="text-sm text-foreground/70">Progress indicator with glass effects</p>
                </div>
              </GlassCardContent>
            </GlassCard>

            <GlassCard variant="floating" className="animate-glass-in" style={{ animationDelay: '0.2s' }}>
              <GlassCardHeader>
                <GlassCardTitle>
                  <FontAwesomeIcon icon={faCrown} className="w-5 h-5 mr-2 text-warning" />
                  Floating Glass
                </GlassCardTitle>
                <GlassCardDescription>
                  Maximum elevation with heavy blur and floating shadows.
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="flex items-center justify-center py-8">
                  <div className="w-16 h-16 glass-primary rounded-full flex items-center justify-center animate-float">
                    <FontAwesomeIcon icon={faFire} className="w-8 h-8 text-primary-foreground" />
                  </div>
                </div>
              </GlassCardContent>
            </GlassCard>

            {/* Button Variants */}
            <GlassCard variant="base" className="animate-glass-in" style={{ animationDelay: '0.3s' }}>
              <GlassCardHeader>
                <GlassCardTitle>Button Variants</GlassCardTitle>
                <GlassCardDescription>
                  Glass morphism buttons with hover effects and tooltips.
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <GlassButton variant="primary" tooltip="Primary glass button">
                      Primary
                    </GlassButton>
                    <GlassButton variant="default" tooltip="Default glass button">
                      Default
                    </GlassButton>
                  </div>
                  <div className="flex gap-3">
                    <GlassButton variant="ghost" tooltip="Ghost variant">
                      Ghost
                    </GlassButton>
                    <GlassButton variant="icon" tooltip="Icon button">
                      <FontAwesomeIcon icon={faHeart} className="w-4 h-4" />
                    </GlassButton>
                  </div>
                </div>
              </GlassCardContent>
            </GlassCard>

            {/* Tooltip Demo */}
            <GlassCard variant="elevated" className="animate-glass-in" style={{ animationDelay: '0.4s' }}>
              <GlassCardHeader>
                <GlassCardTitle>
                  <FontAwesomeIcon icon={faEye} className="w-5 h-5 mr-2 text-info" />
                  Glass Tooltips
                </GlassCardTitle>
                <GlassCardDescription>
                  Hover over elements to see glass tooltip system.
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="grid grid-cols-2 gap-4">
                  <GlassTooltip content="Beautiful glass tooltip with backdrop blur">
                    <div className="w-full h-12 glass-container rounded-lg flex items-center justify-center cursor-pointer hover:glass-elevated transition-all">
                      Hover me
                    </div>
                  </GlassTooltip>
                  <GlassTooltip content="Tooltips adapt position automatically" position="bottom">
                    <div className="w-full h-12 glass-primary rounded-lg flex items-center justify-center cursor-pointer text-primary-foreground">
                      Bottom tip
                    </div>
                  </GlassTooltip>
                </div>
              </GlassCardContent>
            </GlassCard>

            {/* Layered Effects */}
            <GlassCard variant="floating" className="animate-glass-in" style={{ animationDelay: '0.5s' }}>
              <GlassCardHeader>
                <GlassCardTitle>Layered Transparency</GlassCardTitle>
                <GlassCardDescription>
                  Multiple layers of glass creating depth and hierarchy.
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="relative p-6">
                  <div className="glass-container p-4 rounded-lg">
                    <div className="glass-elevated p-4 rounded-lg">
                      <div className="glass-floating p-4 rounded-lg text-center">
                        <FontAwesomeIcon icon={faSparkles} className="w-6 h-6 text-primary" />
                        <p className="text-sm mt-2 text-foreground/80">Triple layered glass</p>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCardContent>
            </GlassCard>
          </div>
        )}

        {activeDemo === 'forms' && (
          <div className="max-w-2xl mx-auto">
            <GlassCard variant="elevated" className="animate-glass-in">
              <GlassCardHeader>
                <GlassCardTitle>
                  <FontAwesomeIcon icon={faPalette} className="w-5 h-5 mr-2 text-primary" />
                  Glass Form Elements
                </GlassCardTitle>
                <GlassCardDescription>
                  Form inputs with liquid glass aesthetic and minimal interface design.
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="space-y-6">
                  <GlassInput
                    label="Glass Text Input"
                    placeholder="Enter text here..."
                    tooltip="Glass morphism text input with backdrop blur"
                    minimal
                  />

                  <GlassTextarea
                    label="Glass Textarea"
                    placeholder="Enter longer text here..."
                    tooltip="Resizable glass textarea"
                    minimal
                    rows={4}
                  />

                  <GlassSelect
                    label="Glass Select"
                    tooltip="Dropdown with glass styling"
                    minimal
                  >
                    <option value="">Choose an option...</option>
                    <option value="ios26">iOS 26 Design</option>
                    <option value="liquid">Liquid Glass</option>
                    <option value="morphism">Glass Morphism</option>
                  </GlassSelect>

                  <div className="flex gap-4 pt-4">
                    <GlassButton variant="primary" className="flex-1">
                      <FontAwesomeIcon icon={faRocket} className="w-4 h-4 mr-2" />
                      Submit Form
                    </GlassButton>
                    <GlassButton variant="ghost">
                      Reset
                    </GlassButton>
                  </div>
                </div>
              </GlassCardContent>
            </GlassCard>
          </div>
        )}

        {activeDemo === 'effects' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <GlassCard variant="floating" className="animate-glass-in">
              <GlassCardHeader>
                <GlassCardTitle>
                  <FontAwesomeIcon icon={faMagicWandSparkles} className="w-5 h-5 mr-2 text-accent" />
                  Dynamic Effects
                </GlassCardTitle>
                <GlassCardDescription>
                  Animated glass elements with floating and glow effects.
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="grid grid-cols-3 gap-4 py-8">
                  <div className="w-16 h-16 glass-container rounded-full animate-float flex items-center justify-center">
                    <FontAwesomeIcon icon={faGem} className="w-6 h-6 text-primary" />
                  </div>
                  <div className="w-16 h-16 glass-primary rounded-full animate-glow flex items-center justify-center" style={{ animationDelay: '0.5s' }}>
                    <FontAwesomeIcon icon={faSparkles} className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="w-16 h-16 glass-elevated rounded-full animate-float flex items-center justify-center" style={{ animationDelay: '1s' }}>
                    <FontAwesomeIcon icon={faCrown} className="w-6 h-6 text-accent" />
                  </div>
                </div>
              </GlassCardContent>
            </GlassCard>

            <GlassCard variant="elevated" className="animate-glass-in" style={{ animationDelay: '0.2s' }}>
              <GlassCardHeader>
                <GlassCardTitle>Specular Highlights</GlassCardTitle>
                <GlassCardDescription>
                  Light refraction and reflection effects for enhanced realism.
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="space-y-4">
                  <div className="h-16 glass-container rounded-lg relative overflow-hidden highlight-specular">
                    <div className="absolute inset-0 bg-glass-refraction opacity-50"></div>
                    <div className="relative z-10 h-full flex items-center justify-center">
                      <span className="text-sm font-medium">Light Specular</span>
                    </div>
                  </div>

                  <div className="h-16 glass-primary rounded-lg relative overflow-hidden highlight-specular-heavy">
                    <div className="absolute inset-0 bg-glass-refraction-orange opacity-60"></div>
                    <div className="relative z-10 h-full flex items-center justify-center text-primary-foreground">
                      <span className="text-sm font-medium">Heavy Specular</span>
                    </div>
                  </div>
                </div>
              </GlassCardContent>
            </GlassCard>
          </div>
        )}
      </div>

      {/* Footer with Glass */}
      <div className="mt-20">
        <GlassCard variant="elevated" className="max-w-4xl mx-auto">
          <GlassCardContent>
            <div className="text-center py-8">
              <p className="text-foreground/70 mb-4">
                iOS 26 Liquid Glass Design System implemented with React and Tailwind CSS
              </p>
              <div className="flex items-center justify-center gap-4">
                <GlassButton variant="primary" tooltip="View Source Code">
                  <FontAwesomeIcon icon={faRocket} className="w-4 h-4 mr-2" />
                  Get Started
                </GlassButton>
                <GlassButton variant="ghost" tooltip="Read Documentation">
                  Learn More
                </GlassButton>
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>
    </div>
  );
};

export default GlassDemo;