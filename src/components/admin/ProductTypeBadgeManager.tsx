'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Leaf, Clock, Thermometer, Users, Eye, Star, Heart, Zap, Award, CheckCircle, ShieldCheck, Sparkles } from 'lucide-react';

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
];

const getIconComponent = (iconName: string) => {
  const iconOption = ICON_OPTIONS.find(opt => opt.value === iconName);
  return iconOption ? iconOption.icon : Leaf;
};

export default function ProductTypeBadgeManager({ initialBadges }: ProductTypeBadgeManagerProps) {
  const [selectedType, setSelectedType] = useState<string>('empanada');
  const [badge1, setBadge1] = useState<string>('');
  const [badge2, setBadge2] = useState<string>('');
  const [badge3, setBadge3] = useState<string>('');
  const [icon1, setIcon1] = useState<string>('leaf');
  const [icon2, setIcon2] = useState<string>('clock');
  const [icon3, setIcon3] = useState<string>('thermometer');
  const [bgColor, setBgColor] = useState<string>('#c2410c');
  const [textColor, setTextColor] = useState<string>('#ffffff');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Update form when product type changes
  const handleTypeChange = (value: string) => {
    setSelectedType(value);
    const badgeData = initialBadges.find(b => b.productType === value);
    if (badgeData) {
      setBadge1(badgeData.badge1);
      setBadge2(badgeData.badge2);
      setBadge3(badgeData.badge3 || '');
      setIcon1(badgeData.icon1 || 'leaf');
      setIcon2(badgeData.icon2 || 'clock');
      setIcon3(badgeData.icon3 || 'thermometer');
      setBgColor(badgeData.bgColor || '#c2410c');
      setTextColor(badgeData.textColor || '#ffffff');
    }
  };

  // Initialize form with first product type
  useState(() => {
    const firstBadge = initialBadges.find(b => b.productType === selectedType);
    if (firstBadge) {
      setBadge1(firstBadge.badge1);
      setBadge2(firstBadge.badge2);
      setBadge3(firstBadge.badge3 || '');
      setIcon1(firstBadge.icon1 || 'leaf');
      setIcon2(firstBadge.icon2 || 'clock');
      setIcon3(firstBadge.icon3 || 'thermometer');
      setBgColor(firstBadge.bgColor || '#c2410c');
      setTextColor(firstBadge.textColor || '#ffffff');
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
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Badges updated successfully!' });
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
    <div className="grid md:grid-cols-2 gap-6">
      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Badge Configuration</CardTitle>
          <CardDescription>
            Update badge text for each product type
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Product Type Selector */}
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

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={isLoading || !badge1.trim() || !badge2.trim()}
            className="w-full"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
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
  );
}
