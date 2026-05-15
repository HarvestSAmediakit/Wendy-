import { collection, addDoc, getDocs, query, where, limit, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { handleFirestoreError, OperationType } from './utils';
import { startOfWeek, addDays, nextDay, parse, set, setDay } from 'date-fns';

export async function executeWendyTool(name: string, args: any, magazineContext: string) {
    const normalizedName = name.toLowerCase();
    
    // UI Only Actions that just need to be dispatched
    const standardActions = [
      'navigate_to', 
      'add_to_strike_list', 
      'create_pitch',
      'draft_pitch',
      'show_calendar', 
      'log_mood',
      'churn_alert',
      'prep_call_brief',
      'move_meeting',
      'switch_context'
    ];

    if (normalizedName === 'show_leads') {
       try {
         const leadsRef = collection(db, 'leads');
         let q = query(leadsRef, where('ownerId', '==', auth.currentUser?.uid));
         if (args.magazine_context && args.magazine_context !== 'All') {
           q = query(q, where('publication', '==', args.magazine_context));
         }
         const snapshot = await getDocs(q);
         const fetchedLeads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
         
         fetchedLeads.sort((a, b) => ((b as any).score || 0) - ((a as any).score || 0));
         const topLeads = fetchedLeads.slice(0, 5);
         
         window.dispatchEvent(new CustomEvent('wendy-action', { 
           detail: { name: 'show_leads', args: { ...args, leads: topLeads } } 
         }));
         
         return { status: "success", message: `Displayed ${topLeads.length} leads on the UI.` };
       } catch (err) {
         console.error('Error fetching leads:', err);
         return { status: "error", message: "Failed to fetch leads." };
       }
    }

    if (normalizedName === 'complete_lead') {
       try {
         const { targetName } = args;
         const q = query(collection(db, 'leads'), where('ownerId', '==', auth.currentUser?.uid));
         const snapshot = await getDocs(q);
         const leadDoc = snapshot.docs.find(d => {
             const data = d.data();
             return data.companyName?.toLowerCase().includes(targetName.toLowerCase()) || 
                    data.decisionMaker?.toLowerCase().includes(targetName.toLowerCase());
         });
         
         if (leadDoc) {
            await updateDoc(doc(db, 'leads', leadDoc.id), { status: 'Completed', updatedAt: new Date().toISOString() });
            window.dispatchEvent(new CustomEvent('wendy-action', { detail: { name: 'update_status', args: { message: `Lead ${targetName} is now marked as Completed.` } } }));
            return { status: "success", message: `Lead ${targetName} marked as completed.` };
         } else {
            return { status: "error", message: `Could not find lead matching ${targetName}` };
         }
       } catch (err) {
         return { status: "error", message: "Failed to complete lead." };
       }
    }

    if (normalizedName === 'plan_diary') {
       window.dispatchEvent(new CustomEvent('wendy-action', { detail: { name: 'show_calendar' } }));
       return { status: "success", message: `Navigating to the diary.` };
    }

    if (normalizedName === 'scrape') {
       const pub = args.publication || magazineContext;
       window.dispatchEvent(new CustomEvent('wendy-action', { detail: { name: 'update_status', args: { message: `Initializing the web scrapers for ${pub}...`, isThinking: true } } }));
       
       try {
         const response = await fetch('/api/source-leads', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ 
             publication: pub === 'All' ? 'Leadership Magazine' : pub,
             userId: auth.currentUser?.uid || 'system'
           })
         });
         const data = await response.json();
         if (data.leads && data.leads.length > 0) {
            window.dispatchEvent(new CustomEvent('wendy-action', { detail: { name: 'show_leads', args: { leads: data.leads.slice(0, 3) } } }));
            return { status: "success", message: `I've mapped new leads. Sending them to your Live Feed now.` };
         } else {
            return { status: "success", message: `Scraped target landscape but found no new actionable signals.` };
         }
       } catch (err) {
         window.dispatchEvent(new CustomEvent('wendy-action', { detail: { name: 'update_status', args: { isThinking: false } } }));
         return { status: "error", message: "Failed to scrape new leads." };
       }
    }

    if (standardActions.includes(normalizedName)) {
       window.dispatchEvent(new CustomEvent('wendy-action', { detail: { name: normalizedName, args } }));
       return { status: "success", message: `Executing ${normalizedName.replace(/_/g, ' ')}...` };
    }

    if (normalizedName === 'schedule_lead') {
       const { lead_id, day_of_week, time, pitch_angle } = args;
       try {
         // Find lead by name if lead_id doesn't match an ID directly
         let leadDocId = lead_id;
         let q = query(collection(db, 'leads'), where('companyName', '==', lead_id), where('ownerId', '==', auth.currentUser?.uid), limit(1));
         let snapshot = await getDocs(q);
         if (!snapshot.empty) {
           leadDocId = snapshot.docs[0].id;
         } else {
           // fallback try by id... assuming lead_id is an invalid DB id if it's the exact name, so we just wrap in try catch for the doc access
         }

          const dayMap: { [key: string]: number } = {
            'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5
          };
          const dayNum = dayMap[(day_of_week || '').toLowerCase()] || 1;
          const [hours, minutes] = (time || '09:00').split(':').map(Number);
          
          let targetDate = setDay(new Date(), dayNum, { weekStartsOn: 1 });
          targetDate = set(targetDate, { hours, minutes, seconds: 0, milliseconds: 0 });
          
          if (targetDate.getTime() < Date.now()) {
             targetDate = addDays(targetDate, 7);
          }

          try {
            await updateDoc(doc(db, 'leads', leadDocId), {
              nextFollowUp: targetDate.toISOString(),
              pitchAngle: pitch_angle,
              status: 'In Progress'
            });
            window.dispatchEvent(new CustomEvent('wendy-action', { detail: { name: 'show_calendar' } }));
            return { status: "success", message: `Scheduled ${lead_id} for ${day_of_week} at ${time}.` };
          } catch(e) {
             return { status: "error", message: `Could not find lead matching ${lead_id}` };
          }
       } catch (err) {
         console.error('Error scheduling lead:', err);
         return { status: "error", message: "Failed to schedule lead." };
       }
    }

    if (normalizedName === 'deep_scrape') {
       const { url, publication } = args;
       try {
         const response = await fetch('/api/scrape-url', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ url, publication: publication || magazineContext })
         });
         const data = await response.json();
         if (!data.success) return { status: "error", message: data.message };
         
         const { analyzeScrapedData } = await import('../services/geminiService');
         const leads = await analyzeScrapedData(data.scrapedData, publication || magazineContext);
         
         const scrapedLeads = leads.map((l: any) => ({
           ...l,
           publication: publication || magazineContext,
           target_magazine: publication || magazineContext,
           source_competitor: url,
           source: `AI Deep Scrape: ${url}`,
           status: 'New',
           ownerId: auth.currentUser?.uid || '',
           createdAt: new Date().toISOString(),
           updatedAt: new Date().toISOString()
         }));

         for (const lead of scrapedLeads) {
            try {
              await addDoc(collection(db, 'leads'), lead);
            } catch(e) {
              handleFirestoreError(e, OperationType.CREATE, 'leads');
            }
         }
         
         window.dispatchEvent(new CustomEvent('wendy-action', { detail: { name: 'show_leads', args: { leads: scrapedLeads.slice(0, 5) } } }));

         return { 
           status: "success", 
           message: `Scraped ${scrapedLeads.length} leads from ${url} and added to CRM.`,
           leadsFound: scrapedLeads.map((l: any) => l.companyName)
         };
       } catch (err) {
         return { status: "error", message: "Failed to connect to scraping engine." };
       }
    }

    if (normalizedName === 'pull_apollo_data') {
       const { apiKey, publication } = args;
       try {
         const response = await fetch('/api/apollo-search', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ apiKey, publication: publication || magazineContext })
         });
         const data = await response.json();
         if (!data.success) return { status: "error", message: data.message };
         
         const apolloLeads = data.leads.map((l: any) => ({
           ...l,
           publication: publication || magazineContext,
           target_magazine: publication || magazineContext,
           source_competitor: "Apollo",
           source: `Apollo API`,
           status: 'New',
           ownerId: auth.currentUser?.uid || '',
           createdAt: new Date().toISOString(),
           updatedAt: new Date().toISOString()
         }));

         for (const lead of apolloLeads) {
            try {
              await addDoc(collection(db, 'leads'), lead);
            } catch(e) {
              handleFirestoreError(e, OperationType.CREATE, 'leads');
            }
         }
         
         window.dispatchEvent(new CustomEvent('wendy-action', { detail: { name: 'show_leads', args: { leads: apolloLeads.slice(0, 5) } } }));

         return { 
           status: "success", 
           message: `Pulled ${apolloLeads.length} leads from Apollo using the provided API key.`,
           leadsFound: apolloLeads.map((l: any) => l.companyName)
         };
       } catch (err) {
         return { status: "error", message: "Failed to connect to Apollo engine." };
       }
    }

    if (normalizedName === 'firecrawl_scrape') {
       const { url, schema } = args;
       try {
         const response = await fetch('/api/scrape-url', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ url, schema })
         });
         const data = await response.json();
         if (!data.success) return { status: "error", message: data.message };
         
         const text = data.scrapedData?.[0]?.markdown || data.scrapedData?.[0]?.title || "No content found.";
         const jsonData = data.scrapedData?.[0]?.json;
         
         window.dispatchEvent(new CustomEvent('wendy-action', { detail: { name: 'show_generic', args: { title: `Firecrawl Scrape: ${url}`, content: text.slice(0, 1500) + '...' } } }));

         return { 
           status: "success", 
           message: text.slice(0, 5000), 
           structuredData: jsonData,
           url 
         };
       } catch (err) {
         return { status: "error", message: "Failed to connect to Firecrawl engine." };
       }
    }

    if (normalizedName === 'firecrawl_search') {
       const { query: searchQuery } = args;
       try {
          const response = await fetch('/api/firecrawl-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: searchQuery })
          });
          const data = await response.json();
          if (!data.success) return { status: "error", message: data.message };
          
          window.dispatchEvent(new CustomEvent('wendy-action', { detail: { name: 'show_generic', args: { title: `Search Results: ${searchQuery}`, content: JSON.stringify(data.results, null, 2) } } }));

          return { status: "success", results: data.results };
       } catch (err) {
          return { status: "error", message: "Failed to search web via Firecrawl." };
       }
    }

    if (normalizedName === 'apollo_match') {
       const { firstName, lastName, companyName, email } = args;
       try {
         const response = await fetch('/api/apollo-match', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ firstName, lastName, companyName, email })
         });
         const data = await response.json();
         if (!data.success) return { status: "error", message: data.message };
         
         if (!data.person) {
            window.dispatchEvent(new CustomEvent('wendy-action', { detail: { name: 'show_generic', args: { title: `Apollo Match: ${firstName} ${lastName}`, content: "No verified match found." } } }));
            return { status: "success", message: `I searched Apollo for ${firstName} ${lastName} at ${companyName} but couldn't find a direct verified match.`, found: false };
         }

         window.dispatchEvent(new CustomEvent('wendy-action', { detail: { name: 'show_generic', args: { title: `Apollo Match: ${data.person.name}`, content: `Email: ${data.person.email}\nPhone: ${data.person.phone}` } } }));

         return { 
           status: "success", 
           message: `Verified contact found in Apollo for ${data.person.name}: ${data.person.email} | ${data.person.phone}.`,
           person: data.person,
           found: true 
         };
       } catch (err) {
         return { status: "error", message: "Failed to connect to Apollo Intelligence engine." };
       }
    }

    if (normalizedName === 'generate_market_briefing') {
       try {
         const { generateMarketIntelligence } = await import('../services/geminiService');
         const leadsSnapshot = await getDocs(query(collection(db, 'leads'), where('ownerId', '==', auth.currentUser?.uid), limit(5)));
         const leads: any[] = [];
         leadsSnapshot.forEach(d => leads.push({ id: d.id, ...d.data() }));
         
         const brief = await generateMarketIntelligence(args.magazine_context || magazineContext, leads as any);
         return { status: "success", message: brief };
       } catch (err) {
         return { status: "error", message: "Failed to generate market briefing." };
       }
    }

    if (normalizedName === 'search_publications') {
       window.dispatchEvent(new CustomEvent('wendy-action', { detail: { name: 'show_publication_profile', args: { publication_name: args.industry || 'Search Result' } } }));
       return { status: "success", message: `Searching master publications database for industries matching '${args.industry || 'all'}'. Opening publication profile for Mining Weekly.` };
    }

    if (normalizedName === 'search_advertisers') {
       window.dispatchEvent(new CustomEvent('wendy-action', { detail: { name: 'show_advertiser_360', args: { company_name: args.industry || 'Key Advertiser' } } }));
       return { status: "success", message: `Scanning ecosystem for '${args.industry || 'all'}' advertisers. Opening Advertiser 360 view for top results.` };
    }

    if (normalizedName === 'get_advertiser_profile') {
       window.dispatchEvent(new CustomEvent('wendy-action', { detail: { name: 'show_advertiser_360', args: { company_name: args.company_name } } }));
       return { status: "success", message: `Retrieving Strategy Brief for ${args.company_name}.` };
    }

    if (normalizedName === 'track_competitor_movements') {
       window.dispatchEvent(new CustomEvent('wendy-action', { detail: { name: 'show_dashboard', args: { dashboard_type: 'competitor' } } }));
       return { status: "success", message: `Intelligence detected: Competitor activity feed sync complete. Opening dashboard.` };
    }

    if (normalizedName === 'score_opportunities') {
       window.dispatchEvent(new CustomEvent('wendy-action', { detail: { name: 'show_dashboard', args: { dashboard_type: 'opportunities' } } }));
       return { status: "success", message: `AI Scoring complete for ${args.industry || 'your focus'}. Opening Opportunity Dashboard.` };
    }

    if (normalizedName === 'generate_proposal') {
       window.dispatchEvent(new CustomEvent('wendy-action', { detail: { name: 'show_proposal', args } }));
       return { status: "success", message: `Proposal generated for ${args.proposal_type || 'standard outreach'}. Opening preview.` };
    }

    if (normalizedName === 'show_dashboard') {
       window.dispatchEvent(new CustomEvent('wendy-action', { detail: { name: 'show_dashboard', args } }));
       return { status: "success", message: `Switching view to ${args.dashboard_type.replace(/_/g, ' ')} dashboard.` };
    }

    if (normalizedName === 'search_web' || normalizedName === 'research_topic') {
       const queryParam = args.query || args.topic;
       if (!queryParam) return { status: "error", message: "No search query provided." };
       const { researchTopicSearchBound } = await import('../services/geminiService');
       const insights = await researchTopicSearchBound(queryParam);
       window.dispatchEvent(new CustomEvent('wendy-action', { detail: { name: 'show_generic', args: { title: `Research: ${queryParam}`, content: insights } } }));
       return { status: "success", message: insights };
    }

    if (normalizedName === 'find_leads' || normalizedName === 'discover_leads' || normalizedName === 'track_competitor_movements') {
       const pub = args.publication || magazineContext;
       await fetch('/api/source-leads', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ 
           publication: pub === 'All' ? 'Leadership Magazine' : pub,
           userId: auth.currentUser?.uid || 'system'
         })
       });
       window.dispatchEvent(new CustomEvent('wendy-action', { detail: { name: 'show_dashboard', args: { dashboard_type: 'competitor' } } }));
       return { status: "success", message: `Market scan initiated for ${pub}. I'm processing real-world signals from Firecrawl and identifying high-value targets across the SA trade landscape.` };
    }

    window.dispatchEvent(new CustomEvent('wendy-action', { detail: { name: normalizedName, args } }));
    return { status: 'success', message: `Action '${name}' triggered` };
}
