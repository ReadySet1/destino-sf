// Icon Mapper Utility
// Maps icon name strings to Lucide React icon components

import {
  Leaf,
  Clock,
  Thermometer,
  Star,
  Heart,
  Zap,
  Award,
  CheckCircle,
  ShieldCheck,
  Sparkles,
  Truck,
  Package,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  'leaf': Leaf,
  'clock': Clock,
  'thermometer': Thermometer,
  'star': Star,
  'heart': Heart,
  'zap': Zap,
  'award': Award,
  'check-circle': CheckCircle,
  'shield-check': ShieldCheck,
  'sparkles': Sparkles,
  'truck': Truck,
  'package': Package,
};

/**
 * Get the Lucide icon component for a given icon name
 * Falls back to Leaf icon if not found
 */
export function getIconComponent(iconName: string): LucideIcon {
  return iconMap[iconName] || Leaf;
}

/**
 * Get Tailwind text color class from color name
 * e.g., "green" -> "text-green-600"
 */
export function getIconColorClass(color: string): string {
  return `text-${color}-600`;
}

/**
 * Get Tailwind background color class from color name
 * e.g., "green-100" -> "bg-green-100"
 */
export function getBgColorClass(bgColor: string): string {
  return `bg-${bgColor}`;
}
