'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Leaf, Clock, Thermometer, Users, Eye, Star, Heart, Zap, Award, CheckCircle, ShieldCheck, Sparkles, Truck, Package } from 'lucide-react';
import { TRUST_SIGNAL_COLOR_OPTIONS } from '@/types/trust-signals';
import { getIconComponent, getIconColorClass, getBgColorClass } from '@/lib/utils/icon-mapper';

interface ProductTypeBadge {
  id: number;
  productType: string;
  badge1: string;
  badge2: string;
  badge3?: string;
  icon1: string;
  icon2: string;
  icon3?: string;
  bgColor: string;
  textColor: string;
  updatedAt: Date;

  // Trust Signals
  trustSignal1Title?: string;
  trustSignal1Desc?: string;
  trustSignal1Icon?: string;
  trustSignal1IconColor?: string;
  trustSignal1BgColor?: string;

  trustSignal2Title?: string;
  trustSignal2Desc?: string;
  trustSignal2Icon?: string;
  trustSignal2IconColor?: string;
  trustSignal2BgColor?: string;

  trustSignal3Title?: string;
  trustSignal3Desc?: string;
  trustSignal3Icon?: string;
  trustSignal3IconColor?: string;
  trustSignal3BgColor?: string;
}

interface ProductTypeBadgeManagerProps {
  initialBadges: ProductTypeBadge[];
}

const PRODUCT_TYPES = [
  { value: 'empanada', label: 'Empanadas' },
  { value: 'salsa', label: 'Salsas' },
  { value: 'alfajor', label: 'Alfajores' },
  { value: 'other', label: 'Other' },
];

const ICON_OPTIONS = [
  { value: 'leaf', label: 'Leaf', icon: Leaf },
  { value: 'clock', label: 'Clock', icon: Clock },
  { value: 'thermometer', label: 'Thermometer', icon: Thermometer },
  { value: 'users', label: 'Users', icon: Users },
  { value: 'eye', label: 'Eye', icon: Eye },
  { value: 'star', label: 'Star', icon: Star },
  { value: 'heart', label: 'Heart', icon: Heart },
  { value: 'zap', label: 'Zap', icon: Zap },
  { value: 'award', label: 'Award', icon: Award },
  { value: 'check-circle', label: 'Check Circle', icon: CheckCircle },
  { value: 'shield-check', label: 'Shield Check', icon: ShieldCheck },
  { value: 'sparkles', label: 'Sparkles', icon: Sparkles },
  { value: 'truck', label: 'Truck', icon: Truck },
  { value: 'package', label: 'Package', icon: Package },
];

export default function ProductTypeBadgeManager({ initialBadges }: ProductTypeBadgeManagerProps) {
  const [selectedType, setSelectedType] = useState<string>('empanada');

  // Badge states
  const [badge1, setBadge1] = useState<string>('');
  const [badge2, setBadge2] = useState<string>('');
  const [badge3, setBadge3] = useState<string>('');
  const [icon1, setIcon1] = useState<string>('leaf');
  const [icon2, setIcon2] = useState<string>('clock');
  const [icon3, setIcon3] = useState<string>('thermometer');
  const [bgColor, setBgColor] = useState<string>('#c2410c');
  const [textColor, setTextColor] = useState<string>('#ffffff');

  // Trust Signal 1 states
  const [trustSignal1Title, setTrustSignal1Title] = useState<string>('Fresh Ingredients');
  const [trustSignal1Desc, setTrustSignal1Desc] = useState<string>('Made with premium, locally-sourced ingredients');
  const [trustSignal1Icon, setTrustSignal1Icon] = useState<string>('leaf');
  const [trustSignal1IconColor, setTrustSignal1IconColor] = useState<string>('green');
  const [trustSignal1BgColor, setTrustSignal1BgColor] = useState<string>('green-100');

  // Trust Signal 2 states
  const [trustSignal2Title, setTrustSignal2Title] = useState<string>('Flash Frozen');
  const [trustSignal2Desc, setTrustSignal2Desc] = useState<string>('Locks in freshness and flavor');
  const [trustSignal2Icon, setTrustSignal2Icon] = useState<string>('thermometer');
  const [trustSignal2IconColor, setTrustSignal2IconColor] = useState<string>('blue');
  const [trustSignal2BgColor, setTrustSignal2BgColor] = useState<string>('blue-100');

  // Trust Signal 3 states
  const [trustSignal3Title, setTrustSignal3Title] = useState<string>('Quick & Easy');
  const [trustSignal3Desc, setTrustSignal3Desc] = useState<string>('Ready in just 15-20 minutes');
  const [trustSignal3Icon, setTrustSignal3Icon] = useState<string>('clock');
  const [trustSignal3IconColor, setTrustSignal3IconColor] = useState<string>('orange');
  const [trustSignal3BgColor, setTrustSignal3BgColor] = useState<string>('orange-100');

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Update form when product type changes
  const handleTypeChange = (value: string) => {
    setSelectedType(value);
    const badgeData = initialBadges.find(b => b.productType === value);
    if (badgeData) {
      // Badge data
      setBadge1(badgeData.badge1);
      setBadge2(badgeData.badge2);
      setBadge3(badgeData.badge3 || '');
      setIcon1(badgeData.icon1 || 'leaf');
      setIcon2(badgeData.icon2 || 'clock');
      setIcon3(badgeData.icon3 || 'thermometer');
      setBgColor(badgeData.bgColor || '#c2410c');
      setTextColor(badgeData.textColor || '#ffffff');

      // Trust Signal 1
      setTrustSignal1Title(badgeData.trustSignal1Title || 'Fresh Ingredients');
      setTrustSignal1Desc(badgeData.trustSignal1Desc || 'Made with premium, locally-sourced ingredients');
      setTrustSignal1Icon(badgeData.trustSignal1Icon || 'leaf');
      setTrustSignal1IconColor(badgeData.trustSignal1IconColor || 'green');
      setTrustSignal1BgColor(badgeData.trustSignal1BgColor || 'green-100');

      // Trust Signal 2
      setTrustSignal2Title(badgeData.trustSignal2Title || 'Flash Frozen');
      setTrustSignal2Desc(badgeData.trustSignal2Desc || 'Locks in freshness and flavor');
      setTrustSignal2Icon(badgeData.trustSignal2Icon || 'thermometer');
      setTrustSignal2IconColor(badgeData.trustSignal2IconColor || 'blue');
      setTrustSignal2BgColor(badgeData.trustSignal2BgColor || 'blue-100');

      // Trust Signal 3
      setTrustSignal3Title(badgeData.trustSignal3Title || 'Quick & Easy');
      setTrustSignal3Desc(badgeData.trustSignal3Desc || 'Ready in just 15-20 minutes');
      setTrustSignal3Icon(badgeData.trustSignal3Icon || 'clock');
      setTrustSignal3IconColor(badgeData.trustSignal3IconColor || 'orange');
      setTrustSignal3BgColor(badgeData.trustSignal3BgColor || 'orange-100');
    }
  };

  // Initialize form with first product type
  useState(() => {
    const firstBadge = initialBadges.find(b => b.productType === selectedType);
    if (firstBadge) {
      // Badge data
      setBadge1(firstBadge.badge1);
      setBadge2(firstBadge.badge2);
      setBadge3(firstBadge.badge3 || '');
      setIcon1(firstBadge.icon1 || 'leaf');
      setIcon2(firstBadge.icon2 || 'clock');
      setIcon3(firstBadge.icon3 || 'thermometer');
      setBgColor(firstBadge.bgColor || '#c2410c');
      setTextColor(firstBadge.textColor || '#ffffff');

      // Trust Signal 1
      setTrustSignal1Title(firstBadge.trustSignal1Title || 'Fresh Ingredients');
      setTrustSignal1Desc(firstBadge.trustSignal1Desc || 'Made with premium, locally-sourced ingredients');
      setTrustSignal1Icon(firstBadge.trustSignal1Icon || 'leaf');
      setTrustSignal1IconColor(firstBadge.trustSignal1IconColor || 'green');
      setTrustSignal1BgColor(firstBadge.trustSignal1BgColor || 'green-100');

      // Trust Signal 2
      setTrustSignal2Title(firstBadge.trustSignal2Title || 'Flash Frozen');
      setTrustSignal2Desc(firstBadge.trustSignal2Desc || 'Locks in freshness and flavor');
      setTrustSignal2Icon(firstBadge.trustSignal2Icon || 'thermometer');
      setTrustSignal2IconColor(firstBadge.trustSignal2IconColor || 'blue');
      setTrustSignal2BgColor(firstBadge.trustSignal2BgColor || 'blue-100');

      // Trust Signal 3
      setTrustSignal3Title(firstBadge.trustSignal3Title || 'Quick & Easy');
      setTrustSignal3Desc(firstBadge.trustSignal3Desc || 'Ready in just 15-20 minutes');
      setTrustSignal3Icon(firstBadge.trustSignal3Icon || 'clock');
      setTrustSignal3IconColor(firstBadge.trustSignal3IconColor || 'orange');
      setTrustSignal3BgColor(firstBadge.trustSignal3BgColor || 'orange-100');
    }
  });

  const handleSave = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/product-type-badges', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_type: selectedType,
          badge1,
          badge2,
          badge3: badge3 || null,
          icon1,
          icon2,
          icon3: badge3 ? icon3 : null, // Only save icon3 if badge3 is set
          bg_color: bgColor,
          text_color: textColor,

          // Trust Signal 1
          trust_signal1_title: trustSignal1Title,
          trust_signal1_desc: trustSignal1Desc,
          trust_signal1_icon: trustSignal1Icon,
          trust_signal1_icon_color: trustSignal1IconColor,
          trust_signal1_bg_color: trustSignal1BgColor,

          // Trust Signal 2
          trust_signal2_title: trustSignal2Title,
          trust_signal2_desc: trustSignal2Desc,
          trust_signal2_icon: trustSignal2Icon,
          trust_signal2_icon_color: trustSignal2IconColor,
          trust_signal2_bg_color: trustSignal2BgColor,

          // Trust Signal 3
          trust_signal3_title: trustSignal3Title,
          trust_signal3_desc: trustSignal3Desc,
          trust_signal3_icon: trustSignal3Icon,
          trust_signal3_icon_color: trustSignal3IconColor,
          trust_signal3_bg_color: trustSignal3BgColor,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Badges and trust signals updated successfully!' });
        // Refresh the page to get updated data
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update badges' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while saving' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Global Product Type Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Product Type Badges</CardTitle>
          <CardDescription>
            Manage badge text displayed on product detail pages for each product type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="product-type">Product Type</Label>
            <Select value={selectedType} onValueChange={handleTypeChange}>
              <SelectTrigger id="product-type">
                <SelectValue placeholder="Select product type" />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
      {/* Badge Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Badge Configuration</CardTitle>
          <CardDescription>
            Update badge text for {PRODUCT_TYPES.find(t => t.value === selectedType)?.label}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Badge 1 Input */}
          <div className="space-y-2">
            <Label htmlFor="badge1">Badge 1</Label>
            <div className="flex gap-2">
              <Input
                id="badge1"
                value={badge1}
                onChange={(e) => setBadge1(e.target.value)}
                maxLength={100}
                placeholder="e.g., Ready to Cook"
                className="flex-1"
              />
              <Select value={icon1} onValueChange={setIcon1}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map(icon => (
                    <SelectItem key={icon.value} value={icon.value}>
                      <div className="flex items-center gap-2">
                        <icon.icon className="w-4 h-4" />
                        {icon.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              {badge1.length}/100 characters
            </p>
          </div>

          {/* Badge 2 Input */}
          <div className="space-y-2">
            <Label htmlFor="badge2">Badge 2</Label>
            <div className="flex gap-2">
              <Input
                id="badge2"
                value={badge2}
                onChange={(e) => setBadge2(e.target.value)}
                maxLength={100}
                placeholder="e.g., 15-20 min"
                className="flex-1"
              />
              <Select value={icon2} onValueChange={setIcon2}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map(icon => (
                    <SelectItem key={icon.value} value={icon.value}>
                      <div className="flex items-center gap-2">
                        <icon.icon className="w-4 h-4" />
                        {icon.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              {badge2.length}/100 characters
            </p>
          </div>

          {/* Badge 3 Input (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="badge3">Badge 3 (Optional)</Label>
            <div className="flex gap-2">
              <Input
                id="badge3"
                value={badge3}
                onChange={(e) => setBadge3(e.target.value)}
                maxLength={100}
                placeholder="e.g., Award Winning"
                className="flex-1"
              />
              <Select value={icon3} onValueChange={setIcon3} disabled={!badge3}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map(icon => (
                    <SelectItem key={icon.value} value={icon.value}>
                      <div className="flex items-center gap-2">
                        <icon.icon className="w-4 h-4" />
                        {icon.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              {badge3.length}/100 characters
            </p>
          </div>

          {/* Color Pickers */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bgColor">Background Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="bgColor"
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  placeholder="#c2410c"
                  className="flex-1"
                  maxLength={7}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="textColor">Text Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="textColor"
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  placeholder="#ffffff"
                  className="flex-1"
                  maxLength={7}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Badge Preview</CardTitle>
          <CardDescription>
            How the badges will appear on product pages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-[hsl(var(--header-orange))] p-8 rounded-lg">
            <div className="flex flex-wrap gap-3">
              {badge1 && (() => {
                const IconComponent = getIconComponent(icon1);
                return (
                  <div
                    className="flex items-center gap-2 backdrop-blur-md border border-white/30 px-4 py-2 rounded-full shadow-lg"
                    style={{
                      backgroundColor: `${bgColor}e6`, // Add 90% opacity
                      color: textColor
                    }}
                  >
                    <IconComponent className="w-4 h-4" style={{ color: textColor }} />
                    <span className="text-sm font-semibold drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                      {badge1}
                    </span>
                  </div>
                );
              })()}
              {badge2 && (() => {
                const IconComponent = getIconComponent(icon2);
                return (
                  <div
                    className="flex items-center gap-2 backdrop-blur-md border border-white/30 px-4 py-2 rounded-full shadow-lg"
                    style={{
                      backgroundColor: `${bgColor}e6`, // Add 90% opacity
                      color: textColor
                    }}
                  >
                    <IconComponent className="w-4 h-4" style={{ color: textColor }} />
                    <span className="text-sm font-semibold drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                      {badge2}
                    </span>
                  </div>
                );
              })()}
              {badge3 && (() => {
                const IconComponent = getIconComponent(icon3);
                return (
                  <div
                    className="flex items-center gap-2 backdrop-blur-md border border-white/30 px-4 py-2 rounded-full shadow-lg"
                    style={{
                      backgroundColor: `${bgColor}e6`, // Add 90% opacity
                      color: textColor
                    }}
                  >
                    <IconComponent className="w-4 h-4" style={{ color: textColor }} />
                    <span className="text-sm font-semibold drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                      {badge3}
                    </span>
                  </div>
                );
              })()}
            </div>
            {!badge1 && !badge2 && (
              <p className="text-white/70 text-sm mt-4">
                Enter badge text to see preview
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Trust Signals Configuration */}
      <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Trust Signals Configuration</CardTitle>
          <CardDescription>
            Customize trust signals for {PRODUCT_TYPES.find(t => t.value === selectedType)?.label} shown below related products in &ldquo;You Might Also Like&rdquo; section
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Trust Signal 1 */}
          <div className="space-y-3 p-4 border rounded-lg">
            <Label className="text-base font-semibold">Trust Signal 1</Label>

            <div className="space-y-2">
              <Label htmlFor="trust1-title">Title</Label>
              <div className="flex gap-2">
                <Input
                  id="trust1-title"
                  value={trustSignal1Title}
                  onChange={(e) => setTrustSignal1Title(e.target.value)}
                  placeholder="e.g., Fresh Ingredients"
                  maxLength={100}
                  className="flex-1"
                />
                <Select value={trustSignal1Icon} onValueChange={setTrustSignal1Icon}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map(icon => (
                      <SelectItem key={icon.value} value={icon.value}>
                        <div className="flex items-center gap-2">
                          <icon.icon className="w-4 h-4" />
                          {icon.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                {trustSignal1Title.length}/100 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trust1-desc">Description</Label>
              <Textarea
                id="trust1-desc"
                value={trustSignal1Desc}
                onChange={(e) => setTrustSignal1Desc(e.target.value)}
                placeholder="e.g., Made with premium, locally-sourced ingredients"
                rows={2}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                {trustSignal1Desc.length}/200 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trust1-color">Icon Color</Label>
              <Select value={trustSignal1IconColor} onValueChange={(value) => {
                setTrustSignal1IconColor(value);
                // Auto-set background color to match
                const colorOption = TRUST_SIGNAL_COLOR_OPTIONS.find(c => c.value === value);
                if (colorOption) {
                  setTrustSignal1BgColor(colorOption.bgValue);
                }
              }}>
                <SelectTrigger id="trust1-color">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRUST_SIGNAL_COLOR_OPTIONS.map(color => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full bg-${color.value}-100 border border-${color.value}-300`} />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Trust Signal 2 */}
          <div className="space-y-3 p-4 border rounded-lg">
            <Label className="text-base font-semibold">Trust Signal 2</Label>

            <div className="space-y-2">
              <Label htmlFor="trust2-title">Title</Label>
              <div className="flex gap-2">
                <Input
                  id="trust2-title"
                  value={trustSignal2Title}
                  onChange={(e) => setTrustSignal2Title(e.target.value)}
                  placeholder="e.g., Flash Frozen"
                  maxLength={100}
                  className="flex-1"
                />
                <Select value={trustSignal2Icon} onValueChange={setTrustSignal2Icon}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map(icon => (
                      <SelectItem key={icon.value} value={icon.value}>
                        <div className="flex items-center gap-2">
                          <icon.icon className="w-4 h-4" />
                          {icon.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                {trustSignal2Title.length}/100 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trust2-desc">Description</Label>
              <Textarea
                id="trust2-desc"
                value={trustSignal2Desc}
                onChange={(e) => setTrustSignal2Desc(e.target.value)}
                placeholder="e.g., Locks in freshness and flavor"
                rows={2}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                {trustSignal2Desc.length}/200 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trust2-color">Icon Color</Label>
              <Select value={trustSignal2IconColor} onValueChange={(value) => {
                setTrustSignal2IconColor(value);
                // Auto-set background color to match
                const colorOption = TRUST_SIGNAL_COLOR_OPTIONS.find(c => c.value === value);
                if (colorOption) {
                  setTrustSignal2BgColor(colorOption.bgValue);
                }
              }}>
                <SelectTrigger id="trust2-color">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRUST_SIGNAL_COLOR_OPTIONS.map(color => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full bg-${color.value}-100 border border-${color.value}-300`} />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Trust Signal 3 */}
          <div className="space-y-3 p-4 border rounded-lg">
            <Label className="text-base font-semibold">Trust Signal 3</Label>

            <div className="space-y-2">
              <Label htmlFor="trust3-title">Title</Label>
              <div className="flex gap-2">
                <Input
                  id="trust3-title"
                  value={trustSignal3Title}
                  onChange={(e) => setTrustSignal3Title(e.target.value)}
                  placeholder="e.g., Quick & Easy"
                  maxLength={100}
                  className="flex-1"
                />
                <Select value={trustSignal3Icon} onValueChange={setTrustSignal3Icon}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map(icon => (
                      <SelectItem key={icon.value} value={icon.value}>
                        <div className="flex items-center gap-2">
                          <icon.icon className="w-4 h-4" />
                          {icon.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                {trustSignal3Title.length}/100 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trust3-desc">Description</Label>
              <Textarea
                id="trust3-desc"
                value={trustSignal3Desc}
                onChange={(e) => setTrustSignal3Desc(e.target.value)}
                placeholder="e.g., Ready in just 15-20 minutes"
                rows={2}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                {trustSignal3Desc.length}/200 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trust3-color">Icon Color</Label>
              <Select value={trustSignal3IconColor} onValueChange={(value) => {
                setTrustSignal3IconColor(value);
                // Auto-set background color to match
                const colorOption = TRUST_SIGNAL_COLOR_OPTIONS.find(c => c.value === value);
                if (colorOption) {
                  setTrustSignal3BgColor(colorOption.bgValue);
                }
              }}>
                <SelectTrigger id="trust3-color">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRUST_SIGNAL_COLOR_OPTIONS.map(color => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full bg-${color.value}-100 border border-${color.value}-300`} />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trust Signals Preview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Trust Signals Preview</CardTitle>
          <CardDescription>
            How the trust signals will appear for {PRODUCT_TYPES.find(t => t.value === selectedType)?.label} products
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 text-center bg-gray-50 p-6 rounded-lg">
            {/* Trust Signal 1 Preview */}
            <div className="flex flex-col items-center">
              <div className={`w-12 h-12 ${getBgColorClass(trustSignal1BgColor)} rounded-full flex items-center justify-center mb-2`}>
                {(() => {
                  const IconComponent = getIconComponent(trustSignal1Icon);
                  return <IconComponent className={`w-6 h-6 ${getIconColorClass(trustSignal1IconColor)}`} />;
                })()}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{trustSignal1Title}</h3>
              <p className="text-gray-600 text-sm">{trustSignal1Desc}</p>
            </div>

            {/* Trust Signal 2 Preview */}
            <div className="flex flex-col items-center">
              <div className={`w-12 h-12 ${getBgColorClass(trustSignal2BgColor)} rounded-full flex items-center justify-center mb-2`}>
                {(() => {
                  const IconComponent = getIconComponent(trustSignal2Icon);
                  return <IconComponent className={`w-6 h-6 ${getIconColorClass(trustSignal2IconColor)}`} />;
                })()}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{trustSignal2Title}</h3>
              <p className="text-gray-600 text-sm">{trustSignal2Desc}</p>
            </div>

            {/* Trust Signal 3 Preview */}
            <div className="flex flex-col items-center">
              <div className={`w-12 h-12 ${getBgColorClass(trustSignal3BgColor)} rounded-full flex items-center justify-center mb-2`}>
                {(() => {
                  const IconComponent = getIconComponent(trustSignal3Icon);
                  return <IconComponent className={`w-6 h-6 ${getIconColorClass(trustSignal3IconColor)}`} />;
                })()}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{trustSignal3Title}</h3>
              <p className="text-gray-600 text-sm">{trustSignal3Desc}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Save Button */}
      <div className="space-y-4">
        <Button
          onClick={handleSave}
          disabled={isLoading || !badge1.trim() || !badge2.trim()}
          className="w-full"
          size="lg"
        >
          {isLoading ? 'Saving...' : 'Save All Changes'}
        </Button>

        {/* Success/Error Message */}
        {message && (
          <div
            className={`p-3 rounded-md text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
