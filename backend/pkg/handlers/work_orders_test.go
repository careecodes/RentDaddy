package handlers_test

import (
	"github.com/DATA-DOG/go-sqlmock"
	"github.com/careecodes/RentDaddy/pkg/handlers"
	"testing"
)

func TestCreateWorkOrderHandler(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("an error '%s' was not expected when opening a stub database connection", err)
	}
	defer db.Close()

	mock.ExpectBegin()
	mock.ExpectQuery("INSERT INTO work_orders").WithArgs().WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(1))
	mock.ExpectCommit()

}
