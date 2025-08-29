import { IField } from '../models/Stadium';

export const calculateHourlyRate = (field: IField, date: Date, time: string): number => {
  const dayOfWeek = date.getDay();
  const timeMinutes = convertTimeToMinutes(time);
  
  if (field.pricing.pricingTiers) {
    const activeTier = field.pricing.pricingTiers.find((tier: { isActive: any; daysOfWeek: number[]; startTime: string; endTime: string; }) => 
      tier.isActive &&
      tier.daysOfWeek.includes(dayOfWeek) &&
      timeMinutes >= convertTimeToMinutes(tier.startTime) &&
      timeMinutes < convertTimeToMinutes(tier.endTime)
    );
        
    if (activeTier) {
      return activeTier.hourlyRate;
    }
  }
  
  return field.pricing.baseHourlyRate;
};

export const getPricingForDateTime = (field: IField, date: Date, startTime: string, endTime: string): {
  totalPrice: number;
  baseRate: number;
  appliedTier?: IPricingTier;
  duration: number;
} => {
  const startMinutes = convertTimeToMinutes(startTime);
  const endMinutes = convertTimeToMinutes(endTime);
  const duration = (endMinutes - startMinutes) / 60;
  
  let totalPrice = 0;
  let appliedTier: IPricingTier | undefined;
  
  // หากมี pricing tiers ให้คำนวณตามช่วงเวลา
  if (field.pricing.pricingTiers) {
    const dayOfWeek = date.getDay();
    const activeTiers = field.pricing.pricingTiers.filter((tier: { isActive: any; daysOfWeek: number[]; }) => 
      tier.isActive && tier.daysOfWeek.includes(dayOfWeek)
    );
        
    if (activeTiers.length > 0) {
      // คำนวณราคาตามช่วงเวลา
      for (let minute = startMinutes; minute < endMinutes; minute += 30) {
        const tier = activeTiers.find((t: { startTime: string; endTime: string; }) => 
          minute >= convertTimeToMinutes(t.startTime) &&
          minute < convertTimeToMinutes(t.endTime)
        );
                
        const rate = tier ? tier.hourlyRate : field.pricing.baseHourlyRate;
        totalPrice += rate / 2; // 30 minutes increment
                
        if (tier && !appliedTier) {
          appliedTier = tier;
        }
      }
    } else {
      totalPrice = field.pricing.baseHourlyRate * duration;
    }
  } else {
    totalPrice = field.pricing.baseHourlyRate * duration;
  }
  
  return {
    totalPrice: Math.round(totalPrice),
    baseRate: field.pricing.baseHourlyRate,
    appliedTier,
    duration
  };
};

const convertTimeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};


export interface IPricingTier {
  name: string;
  description?: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  hourlyRate: number;
  isActive: boolean;
}