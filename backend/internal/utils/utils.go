package utils

import (
	"fmt"
	"math/rand"
)

func CreatePhoneNumber() string {
	area := rand.Intn(900) + 100
	middle := rand.Intn(900) + 100
	last := rand.Intn(10000)

	return fmt.Sprintf("%d%d%d", area, middle, last)
}
