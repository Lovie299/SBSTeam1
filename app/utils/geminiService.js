// app/utils/geminiService.js - Accurate mock responses
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = 'AIzaSyDvUuRxxwfkIzzljsNuS_HrbLnbMAzHwJ0';

class GeminiService {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.isInitialized = false;
  }

  initialize() {
    console.log('✅ Using expert conservation knowledge base');
    return false;
  }

  async generateConservationInsight(prompt) {
    console.log('📤 Question received:', prompt);
    return this.getMockResponse(prompt);
  }

  getMockResponse(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    
    // TRACKING / FIND GORILLAS
    if (lowerPrompt.includes('track') || lowerPrompt.includes('find') || lowerPrompt.includes('locate') || lowerPrompt.includes('where')) {
      return "Tips for tracking gorillas:\n\n• Look for fresh trails - bent vegetation, footprints, and fresh dung indicate recent passage\n• Listen for vocalizations - hoots and chest beats can be heard from over 1km away\n• Track early morning (6-9 AM) when gorillas are most active after leaving nests\n• Look for night nests - they build new nests every evening, never reuse\n• Note feeding signs - partially eaten vegetation, broken branches\n• Fresh dung is warm and moist - good indicator of nearby group\n\nAlways log your starting point and any signs you find in the app!\n\n📍 Pro tip: Silverbacks often leave a distinctive smell that experienced trackers can detect.";
    }
    
    // HEALTH / SICK GORILLA
    if (lowerPrompt.includes('health') || lowerPrompt.includes('sick') || lowerPrompt.includes('ill') || lowerPrompt.includes('disease')) {
      return "To identify a sick or injured gorilla, look for these key signs:\n\n• Loss of appetite - not eating or eating much less than usual\n• Lethargy - unusual inactivity, sleeping more, not keeping up with group\n• Respiratory symptoms - coughing, runny nose, wheezing, labored breathing\n• Skin issues - lesions, hair loss, wounds, or unusual marks\n• Digestive problems - diarrhea, vomiting, or bloating\n• Limping or favoring a limb - possible injury\n• Isolation - staying away from the rest of the group\n\n⚠️ If you observe these signs, maintain at least 7 meters distance and report to the veterinary team immediately with precise GPS coordinates. Do not attempt to approach or treat the animal yourself.";
    }
    
    // BEHAVIOR
    if (lowerPrompt.includes('behavior') || lowerPrompt.includes('habit') || lowerPrompt.includes('act')) {
      return "Common gorilla behaviors to observe and document:\n\n• Chest beating - display of strength and communication, not aggression (primarily done by silverbacks)\n• Ground thumping - warning signal to other group members or potential threats\n• Vocalizations - hoots, grunts, barks, and screams for different types of communication\n• Nest building - they build fresh nests every evening, never reuse\n• Grooming - social bonding activity, strengthens group relationships\n• Feeding - mostly herbivorous, observe which plants they prefer\n• Play - juveniles wrestle and chase each other (important for development)\n\n📝 Documenting these behaviors consistently helps researchers track group health, social dynamics, and identify changes over time.";
    }
    
    // CONSERVATION / PROTECT
    if (lowerPrompt.includes('conservation') || lowerPrompt.includes('protect') || lowerPrompt.includes('save')) {
      return "Essential ways to protect gorillas in the wild:\n\n1. Report any signs of poaching immediately - snares, gunshots, suspicious persons\n2. Maintain minimum 7 meters (23 feet) distance from gorillas at all times\n3. Avoid direct eye contact with silverbacks - can be perceived as a challenge\n4. Keep voices low to minimize disturbance to natural behavior\n5. Never feed gorillas - human food disrupts their natural diet and can spread disease\n6. Log all sightings with precise GPS coordinates in the SilverBack Sentry app\n7. Report sick or injured gorillas to the veterinary team immediately\n8. Stay on designated trails to minimize habitat disturbance\n9. Follow all COVID-19 and disease prevention protocols (wear masks when required)\n10. Remove all trash - gorillas can be harmed by ingesting garbage\n\n🌍 Every observation logged in this app contributes directly to conservation efforts and helps protect these magnificent creatures for future generations.";
    }
    
    // SILVERBACK / GROUP DYNAMICS
    if (lowerPrompt.includes('silverback') || lowerPrompt.includes('group') || lowerPrompt.includes('troop') || lowerPrompt.includes('family')) {
      return "About gorilla groups (troops) and silverback leadership:\n\nA typical gorilla group consists of:\n• 1-4 silverback males (mature males over 12 years with silver back hair)\n• Several adult females (usually 3-8)\n• Juveniles and infants\n\nGroup size ranges from 5 to 30 members.\n\nThe dominant silverback is the undisputed leader who:\n• Makes all decisions about movement, feeding, and sleeping locations\n• Mediates conflicts within the group\n• Defends the group against predators and rival males\n• Mates with adult females\n• Typically leads for 5-10 years until challenged\n\nWhen a silverback dies or is overthrown, the group may:\n• Fragment (females may join other groups)\n• Be taken over by another male (who may kill infants)\n• Disband completely\n\n📊 Document group composition changes, births, deaths, and silverback leadership changes in the app - this data is crucial for population monitoring.";
    }
    
    // DIET / EATING
    if (lowerPrompt.includes('eat') || lowerPrompt.includes('food') || lowerPrompt.includes('diet') || lowerPrompt.includes('feed')) {
      return "Gorilla diet and feeding habits:\n\n• Mostly herbivorous - leaves, stems, bamboo shoots, and pith\n• Fruits when available seasonally (their favorite!) \n• Small insects occasionally (ants, termites) - less than 1% of diet\n• Adult male consumes up to 30kg (66 lbs) of vegetation per day!\n• Adult female consumes about 18kg (40 lbs) daily\n• They rarely drink water directly - get most moisture from plant material\n• Feed primarily in the morning and late afternoon\n• Each gorilla has its own feeding technique - some strip leaves, others bite directly\n\n🌿 Document feeding sites and preferred plant species in the app - this helps identify important food sources for conservation planning. Gorillas are essential seed dispersers for the forest ecosystem!";
    }
    
    // HABITAT
    if (lowerPrompt.includes('habitat') || lowerPrompt.includes('forest') || lowerPrompt.includes('live') || lowerPrompt.includes('home')) {
      return "Gorilla habitat information:\n\n• Tropical rainforests in Central and East Africa\n• Prefers dense forests with abundant ground vegetation\n• Altitude range from 2,000 to 4,000 meters (6,500 to 13,000 feet)\n• Home range typically 10-15 square kilometers per group\n• Different species prefer different altitudes:\n  - Mountain gorillas: higher altitudes (2,500-4,000m)\n  - Lowland gorillas: lower altitudes (sea level to 2,500m)\n\n🌳 Habitat threats include:\n• Deforestation for agriculture and logging\n• Mining operations\n• Civil unrest and refugee camps\n• Climate change affecting food availability\n\n🏔️ Log habitat conditions, deforestation signs, and threats you observe in the app - this data helps prioritize conservation areas.";
    }
    
    // BABY / INFANT
    if (lowerPrompt.includes('baby') || lowerPrompt.includes('infant') || lowerPrompt.includes('young') || lowerPrompt.includes('offspring')) {
      return "Gorilla infant and reproduction information:\n\n• Gestation period: about 8.5 months (similar to humans)\n• Birth weight: approximately 2kg (4.4 lbs)\n• Newborns have very little hair, unlike adults\n• Infant gorillas ride on mother's back for first 2-3 years\n• Nurse for up to 3-4 years, occasionally longer\n• Females reach adulthood at 8-10 years\n• Males reach adulthood at 12-15 years (develop silver back at ~12 years)\n• Females give birth every 4-6 years (low reproduction rate)\n• Infant mortality is high in first year of life\n\n👶 Document infant births, deaths, and development milestones in the app - this data is critical for population viability monitoring. Each infant represents hope for the species!";
    }
    
    // THREATS / DANGERS
    if (lowerPrompt.includes('threat') || lowerPrompt.includes('danger') || lowerPrompt.includes('risk') || lowerPrompt.includes('poach')) {
      return "Major threats to gorilla survival:\n\n1. Poaching - bushmeat trade and illegal capture for zoos (despite laws)\n2. Habitat loss - deforestation for agriculture, logging, and mining\n3. Disease - Ebola, respiratory infections, and human-transmitted diseases (COVID-19)\n4. Civil unrest - wars and refugee camps encroach on habitat\n5. Climate change - affecting food availability and habitat suitability\n6. Snares - set for other animals but catch gorillas, causing injury or death\n7. Human-wildlife conflict - crop raiding leads to retaliation\n\n⚠️ How YOU can help:\n• Report any signs of poaching or snares immediately\n• Log all threats observed in the app\n• Follow disease prevention protocols (masks, distancing)\n• Support conservation organizations\n\nYour observations in SilverBack Sentry directly contribute to anti-poaching efforts and habitat protection strategies.";
    }
    
    // FALLBACK - GENERAL HELP
    return "🦍 I'm your SilverBack Sentry AI Conservation Assistant. I can provide expert information on:\n\n• How to identify a sick or injured gorilla\n• Common gorilla behaviors and what they mean\n• Conservation strategies and protection methods\n• Silverback leadership and group dynamics\n• Tracking techniques and where to find gorillas\n• Gorilla diet, habitat, and infant care\n• Threats to gorillas and how to help\n\nWhat specific information would you like to know about gorilla conservation?";
  }
}

const geminiService = new GeminiService();
export default geminiService;