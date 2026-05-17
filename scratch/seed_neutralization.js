const mongoose = require('mongoose');
const Chemical = require('./backend/src/models/Chemical');
require('dotenv').config({ path: './backend/.env' });

async function seedNeutralizationData() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27001/cims');
  
  const nitric = await Chemical.findOne({ name: /Nitric Acid/i });
  if (nitric) {
    nitric.emergency_response = {
      ...nitric.emergency_response,
      neutralization: "Slowly add to a large volume of water with stirring. Neutralize with sodium carbonate (soda ash) or calcium hydroxide (lime). Monitor pH constantly. Wear full face shield and acid-resistant apron."
    };
    nitric.incompatibility = ["Bases", "Reducing agents", "Flammable liquids", "Metals"];
    await nitric.save();
    console.log('Updated Nitric Acid with neutralization data');
  } else {
    console.log('Nitric Acid not found, creating a test record');
    await Chemical.create({
      id: 'CHEM-NITRIC-TEST',
      name: 'Nitric Acid (Test)',
      quantity: 500,
      unit: 'mL',
      base_quantity: 0.5,
      base_unit: 'L',
      status: 'In Stock',
      hazard_summary: { health: true, physical: true, environmental: true },
      emergency_response: {
        neutralization: "Slowly add to a large volume of water with stirring. Neutralize with sodium carbonate. Wear full PPE."
      },
      incompatibility: ["Bases", "Flammables"],
      labs: [] // Adjust if needed
    });
  }
  await mongoose.disconnect();
}

seedNeutralizationData().catch(console.error);

