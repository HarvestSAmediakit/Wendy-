import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from './firebase';
import { Lead } from '../types';

export const seedDatabase = async () => {
  if (!auth.currentUser) return { success: false, message: "No authenticated user" };

  const leads: Partial<Lead>[] = [
    {
      companyName: "John Deere SA",
      sector: "Agritech / Equipment",
      publication: "Harvest SA",
      decisionMaker: "Sarah Mokoena",
      title: "Chief Marketing Officer",
      phone: "+27 11 555 0192",
      email: "s.mokoena@johndeere.co.za",
      source: "Farmer's Weekly (March Issue)",
      sourceReasoning: "Full-page advert for new 7R Series Tractors. Direct synergy with Harvest SA Horticulture feature.",
      status: "New",
      score: 92,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: auth.currentUser.uid
    },
    {
      companyName: "Sasol",
      sector: "Energy / Chemicals",
      publication: "Black Business Quarterly",
      decisionMaker: "Thabo Cele",
      title: "Head of Group ESD",
      phone: "+27 11 889 7600",
      email: "thabo.cele@sasol.com",
      source: "Transform SA (Q1 Journal)",
      sourceReasoning: "Mentioned in Supplier Development case study. High value for BBQ transformation focus.",
      status: "In Progress",
      score: 85,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: auth.currentUser.uid
    },
    {
      companyName: "Standard Bank",
      sector: "Finance / Banking",
      publication: "Leadership Magazine",
      decisionMaker: "David Munoz",
      title: "Executive Director: B2B",
      phone: "+27 11 636 9111",
      email: "d.munoz@standardbank.co.za",
      source: "Business Brief (April)",
      sourceReasoning: "Back cover sponsor. Matches Leadership Magazine's C-suite readership profile.",
      status: "New",
      score: 78,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: auth.currentUser.uid
    },
    {
       companyName: "Pannar Seed",
       sector: "Agriculture / Seeds",
       publication: "Harvest SA",
       decisionMaker: "Lindiwe Dlamini",
       title: "Marketing Manager",
       phone: "+27 33 413 9500",
       email: "lindiwe.dlamini@pannar.co.za",
       source: "Landbouweekblad",
       sourceReasoning: "Regular advertiser in competitive trade journals. Strong candidate for digital shift.",
       status: "Follow-up",
       score: 88,
       createdAt: new Date().toISOString(),
       updatedAt: new Date().toISOString(),
       ownerId: auth.currentUser.uid
    }
  ];

  try {
    const leadsCollection = collection(db, 'leads');
    let addedCount = 0;
    
    for (const lead of leads) {
      if (!lead.email) continue;
      // Check if lead already exists
      const q = query(leadsCollection, where('email', '==', lead.email));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        await addDoc(leadsCollection, lead);
        addedCount++;
      }
    }
    
    if (addedCount === 0) {
      return { success: true, message: `No new leads seeded. All MVPs already exist in the database.` };
    }
    return { success: true, message: `Successfully seeded ${addedCount} new lead(s).` };
  } catch (error) {
    console.error("Seeding error:", error);
    return { success: false, message: error instanceof Error ? error.message : "Unknown error during seeding" };
  }
};
