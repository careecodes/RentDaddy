package handlers_test

//// Global variables for DB connection
//var testDB *sql.DB
//var testQueries *db.Queries
//
//// Initialize the test database connection
//func TestMain(m *testing.M) {
//	dbURL := os.Getenv("PG_URL")
//	if dbURL == "" {
//		log.Fatal("PG_URL environment variable is not set")
//	}
//
//	testDB, err := sql.Open("postgres", dbURL)
//	if err != nil {
//		log.Fatalf("Failed to connect to the database: %v", err)
//	}
//	defer testDB.Close()
//
//	testQueries := db.New(mocks.MockDBTX)
//
//	// Run tests
//	code := m.Run()
//
//	os.Exit(code)
//}
//
//// Setup a test transaction (ensures test data is rolled back after each test)
//func SetupTestTransaction(t *testing.T) (context.Context, func()) {
//	ctx := context.Background()
//	tx, err := testDB.Begin(ctx)
//	assert.NoError(t, err, "Failed to begin test transaction")
//
//	// Rollback function to clean up test data after test execution
//	rollback := func() {
//		err := tx.Rollback(ctx)
//		assert.NoError(t, err, "Failed to rollback test transaction")
//	}
//	type ctxKey string
//
//	const txKey ctxKey = "tx"
//
//	return context.WithValue(ctx, txKey, tx), rollback
//}
