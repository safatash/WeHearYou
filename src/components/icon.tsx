import {
  Search,
  Bell,
  Settings,
  LogOut,
  MapPin,
  ChevronDown,
  Check,
  Plus,
  Eye,
  Mail,
  Megaphone,
  Trash2,
  Upload,
  Grid3x3,
  Layers,
  Film,
  Star,
  MessageCircle,
  Send,
  SlidersHorizontal,
  Code,
  Copy,
  Sun,
  Moon,
  Monitor,
  Smartphone,
  ChevronLeft,
  X,
  Sparkles,
  Inbox,
  Plug,
  Package,
  LucideIcon,
} from 'lucide-react';

type IconName =
  | 'search' | 'bell' | 'settings' | 'logout' | 'pin' | 'chevDown' | 'check' | 'plus'
  | 'eye' | 'mail' | 'megaphone' | 'trash' | 'upload' | 'grid' | 'layers' | 'film'
  | 'star' | 'chat' | 'send' | 'sliders' | 'code' | 'copy' | 'sun' | 'moon'
  | 'monitor' | 'phone' | 'chevLeft' | 'close' | 'sparkles' | 'inbox' | 'plug' | 'package';

const iconMap: Record<IconName, LucideIcon> = {
  search: Search,
  bell: Bell,
  settings: Settings,
  logout: LogOut,
  pin: MapPin,
  chevDown: ChevronDown,
  check: Check,
  plus: Plus,
  eye: Eye,
  mail: Mail,
  megaphone: Megaphone,
  trash: Trash2,
  upload: Upload,
  grid: Grid3x3,
  layers: Layers,
  film: Film,
  star: Star,
  chat: MessageCircle,
  send: Send,
  sliders: SlidersHorizontal,
  code: Code,
  copy: Copy,
  sun: Sun,
  moon: Moon,
  monitor: Monitor,
  phone: Smartphone,
  chevLeft: ChevronLeft,
  close: X,
  sparkles: Sparkles,
  inbox: Inbox,
  plug: Plug,
  package: Package,
};

interface IconProps {
  name: IconName;
  size?: number;
  style?: React.CSSProperties;
}

export function Icon({ name, size = 20, style = {} }: IconProps) {
  const LucideIcon = iconMap[name];
  if (!LucideIcon) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }
  return <LucideIcon size={size} style={{ overflow: 'visible', ...style }} />;
}
