// Trust Signals Types
// Trust signals are shown below the "You Might Also Like" section on product detail pages

export interface TrustSignal {
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  bgColor: string;
}

export interface TrustSignalsConfig {
  id: number;
  productType: string;

  // Trust Signal 1
  trustSignal1Title: string;
  trustSignal1Desc: string;
  trustSignal1Icon: string;
  trustSignal1IconColor: string;
  trustSignal1BgColor: string;

  // Trust Signal 2
  trustSignal2Title: string;
  trustSignal2Desc: string;
  trustSignal2Icon: string;
  trustSignal2IconColor: string;
  trustSignal2BgColor: string;

  // Trust Signal 3
  trustSignal3Title: string;
  trustSignal3Desc: string;
  trustSignal3Icon: string;
  trustSignal3IconColor: string;
  trustSignal3BgColor: string;

  updatedAt: Date;
}

// Helper to convert TrustSignalsConfig to array of TrustSignal objects
export function getTrustSignalsArray(config: TrustSignalsConfig): TrustSignal[] {
  return [
    {
      title: config.trustSignal1Title,
      description: config.trustSignal1Desc,
      icon: config.trustSignal1Icon,
      iconColor: config.trustSignal1IconColor,
      bgColor: config.trustSignal1BgColor,
    },
    {
      title: config.trustSignal2Title,
      description: config.trustSignal2Desc,
      icon: config.trustSignal2Icon,
      iconColor: config.trustSignal2IconColor,
      bgColor: config.trustSignal2BgColor,
    },
    {
      title: config.trustSignal3Title,
      description: config.trustSignal3Desc,
      icon: config.trustSignal3Icon,
      iconColor: config.trustSignal3IconColor,
      bgColor: config.trustSignal3BgColor,
    },
  ];
}

// Available icon options for trust signals (from lucide-react)
export const TRUST_SIGNAL_ICON_OPTIONS = [
  { value: 'leaf', label: 'Leaf' },
  { value: 'thermometer', label: 'Thermometer' },
  { value: 'clock', label: 'Clock' },
  { value: 'star', label: 'Star' },
  { value: 'heart', label: 'Heart' },
  { value: 'zap', label: 'Zap' },
  { value: 'award', label: 'Award' },
  { value: 'check-circle', label: 'Check Circle' },
  { value: 'shield-check', label: 'Shield Check' },
  { value: 'sparkles', label: 'Sparkles' },
  { value: 'truck', label: 'Truck' },
  { value: 'package', label: 'Package' },
] as const;

// Available color options for trust signals
export const TRUST_SIGNAL_COLOR_OPTIONS = [
  { value: 'green', bgValue: 'green-100', label: 'Green' },
  { value: 'blue', bgValue: 'blue-100', label: 'Blue' },
  { value: 'orange', bgValue: 'orange-100', label: 'Orange' },
  { value: 'red', bgValue: 'red-100', label: 'Red' },
  { value: 'purple', bgValue: 'purple-100', label: 'Purple' },
  { value: 'yellow', bgValue: 'yellow-100', label: 'Yellow' },
  { value: 'pink', bgValue: 'pink-100', label: 'Pink' },
  { value: 'indigo', bgValue: 'indigo-100', label: 'Indigo' },
] as const;
