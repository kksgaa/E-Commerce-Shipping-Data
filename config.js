const ENV_CONFIG = {
  SUPABASE_URL: "https://pmoxtefmekgjhrpkqbav.supabase.co",  
  SUPABASE_ANON_KEY: "sb_publishable_u_JIGmSW8OM0zxzVgYh3mA_M2gCLTxT",              
};

const { createClient } = supabase;
const supabaseClient = createClient(ENV_CONFIG.SUPABASE_URL, ENV_CONFIG.SUPABASE_ANON_KEY);

async function fetchStats() {
  const { data: dimMetode, error: err1 } = await supabaseClient.from('Dim_Metode_Kirim').select('*');
  if (err1) throw err1;

  const { data: dimGudang, error: err2 } = await supabaseClient.from('Dim_Gudang_Produk').select('*');
  if (err2) throw err2;

  const BATCH = 1000;
  let factData = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabaseClient
      .from('Fact_Pengiriman')
      .select('*')
      .range(from, from + BATCH - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    factData = factData.concat(data);
    if (data.length < BATCH) break;
    from += BATCH;
  }

  const dictMetode = {};
  dimMetode.forEach(d => dictMetode[d.ID_Metode_Kirim] = d.Mode_of_Shipment);

  const dictGudang = {};
  const dictImportance = {};
  dimGudang.forEach(d => {
    dictGudang[d.ID_Gudang] = d.Warehouse_block;
    dictImportance[d.ID_Gudang] = d.Product_importance;
  });

  const joinedData = factData.map(fact => {
    return {
      ...fact, 
      "Reached.on.Time_Y.N": Number(fact["Reached.on.Time_Y.N"]),
      "Customer_care_calls": Number(fact.Customer_care_calls || 0),
      "Weight_in_gms": Number(fact.Weight_in_gms || 0),
      "Customer_rating": 0, 
      
      Mode_of_Shipment: dictMetode[fact.ID_Metode_Kirim] || "Unknown",
      Warehouse_block: dictGudang[fact.ID_Gudang] || "Unknown",
      Product_importance: dictImportance[fact.ID_Gudang] || "Unknown"
    };
  });

  return joinedData;
}