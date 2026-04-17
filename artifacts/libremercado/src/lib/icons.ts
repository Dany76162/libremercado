import { 
  Smartphone, Shirt, Home, ShoppingBag, Pill, UtensilsCrossed, Sparkles, PawPrint,
  Gift, Car, Camera, Heart, Monitor, Zap, Coffee, Music, Tag, type LucideIcon 
} from "lucide-react";

export const CATEGORY_ICONS_MAP: Record<string, LucideIcon> = {
  Smartphone,
  Shirt,
  Home,
  ShoppingBag,
  Pill,
  UtensilsCrossed,
  Sparkles,
  PawPrint,
  Gift,
  Car,
  Camera,
  Heart,
  Monitor,
  Zap,
  Coffee,
  Music,
  Tag
};

export function getCategoryIcon(name: string): LucideIcon {
  return CATEGORY_ICONS_MAP[name] || Tag;
}
