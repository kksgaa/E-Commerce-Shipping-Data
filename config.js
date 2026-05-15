const ENV_CONFIG = {
  SUPABASE_URL: "https://pmoxtefmekgjhrpkqbav.supabase.co",  // <-- Ganti ini
  SUPABASE_ANON_KEY: "sb_publishable_u_JIGmSW8OM0zxzVgYh3mA_M2gCLTxT",              // <-- Ganti ini
};

const TABLE_NAME = "Train";

const { createClient } = supabase;
const supabaseClient = createClient(ENV_CONFIG.SUPABASE_URL, ENV_CONFIG.SUPABASE_ANON_KEY);

async function fetchAllData(filters = {}, page = 1, pageSize = 50) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseClient
    .from(TABLE_NAME)
    .select("*", { count: "exact" });

  if (filters.warehouse_block)
    query = query.eq("Warehouse_block", filters.warehouse_block);
  if (filters.mode_of_shipment)
    query = query.eq("Mode_of_Shipment", filters.mode_of_shipment);
  if (filters.product_importance)
    query = query.eq("Product_importance", filters.product_importance);
  if (filters.reached !== undefined && filters.reached !== "")
    query = query.eq("Reached.on.Time_Y.N", parseInt(filters.reached));
  if (filters.search)
    query = query.ilike("ID", `%${filters.search}%`);

  query = query.range(from, to).order("ID", { ascending: true });

  const { data, error, count } = await query;
  if (error) throw error;
  return { data, count };
}

function normalizeRow(row) {
  return {
    ...row,
    "Reached.on.Time_Y.N": Number(row["Reached.on.Time_Y.N"]),
    "Customer_rating":      Number(row["Customer_rating"]),
    "Customer_care_calls":  Number(row["Customer_care_calls"]),
    "Cost_of_the_Product":  Number(row["Cost_of_the_Product"]),
    "Prior_purchases":      Number(row["Prior_purchases"]),
    "Discount_offered":     Number(row["Discount_offered"]),
    "Weight_in_gms":        Number(row["Weight_in_gms"]),
  };
}

async function fetchStats() {
  const BATCH = 1000;
  let allData = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabaseClient
      .from(TABLE_NAME)
      .select("*")
      .range(from, from + BATCH - 1)
      .order("ID", { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) break;

    allData = allData.concat(data.map(normalizeRow));

    if (data.length < BATCH) break;
    from += BATCH;
  }

  return allData;
}

async function insertRow(row) {
  const { data, error } = await supabaseClient.from(TABLE_NAME).insert([row]).select();
  if (error) throw error;
  return data;
}

async function updateRow(id, row) {
  const { data, error } = await supabaseClient.from(TABLE_NAME).update(row).eq("ID", id).select();
  if (error) throw error;
  return data;
}

async function deleteRow(id) {
  const { error } = await supabaseClient.from(TABLE_NAME).delete().eq("ID", id);
  if (error) throw error;
}

async function fetchRowById(id) {
  const { data, error } = await supabaseClient.from(TABLE_NAME).select("*").eq("ID", id).single();
  if (error) throw error;
  return data;
}