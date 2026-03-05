# Go Development Standards & Guidelines (SFS Platform)

**Document Version:** 1.0  
**Last Updated:** February 2026  
**Scope:** Go 1.25+ microservice development across the SFS platform

This document defines the coding standards, architectural patterns, and best practices for generating and reviewing Go code in the SFS (Secure File Sharing) platform. It is intended for use by backend engineers, code generators, and code reviewers to ensure consistency and quality across all microservices.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Package Organization](#package-organization)
3. [Code Organization](#code-organization)
4. [Naming Conventions](#naming-conventions)
5. [Interface Patterns](#interface-patterns)
6. [Error Handling](#error-handling)
7. [Context Usage](#context-usage)
8. [Concurrency Patterns](#concurrency-patterns)
9. [Testing Standards](#testing-standards)
10. [Documentation Standards](#documentation-standards)
11. [Configuration Management](#configuration-management)
12. [Common Patterns](#common-patterns)
13. [Code Quality](#code-quality)
14. [Build & Compilation](#build--compilation)

---

## Project Structure

### Monorepo Layout

The SFS platform uses a monorepo structure with all Go microservices in a single module:

```
gopath/src/brainloop/
├── go.mod                           (module definition: module brainloop)
├── go.sum                           (dependencies lock file)
├── {service}/                       (50+ microservices)
│   ├── {service}.go                 (main entry point)
│   ├── README.md                    (service documentation)
│   ├── internal/                    (unexported service code)
│   │   ├── db/                      (database layer)
│   │   ├── handlers/                (request handlers)
│   │   ├── services/                (business logic)
│   │   └── ...
│   ├── server/                      (HTTP server setup)
│   │   └── server.go
│   ├── ctl/                         (CLI tools for service)
│   │   └── main.go
│   ├── pkg/                         (public packages)
│   │   └── ...
│   └── tests/                       (integration tests)
│
├── shared/                          (shared across services)
│   ├── rest/                        (REST API utilities)
│   ├── events/                      (event bus)
│   ├── middleware/                  (HTTP middleware)
│   └── ...
│
├── db/                              (database abstraction)
│   ├── db.go
│   ├── repos.go
│   ├── couchbase/
│   ├── cassandra/
│   ├── dynamodb/
│   └── contracts/
│
├── util/                            (utility packages)
│   ├── deployment/
│   ├── httpserver/
│   ├── httpr/                       (HTTP router)
│   ├── logging/
│   ├── tracing/
│   └── ...
│
├── configuration/                   (global configuration)
│   ├── configuration.go
│   ├── discovery.go
│   ├── provider.go
│   └── feature/
│
├── skeleton/                        (microservice scaffold)
│   ├── skeleton.go
│   ├── api/
│   ├── commands/                    (CQRS command handlers)
│   ├── events/                      (domain events)
│   ├── facade/                      (public API)
│   ├── internal/
│   ├── readmodelstore/
│   ├── writemodelstore/
│   └── ...
│
├── e2e/                             (end-to-end tests)
│   ├── e2e_init.go
│   ├── helper.go
│   └── {service}/
│
└── ...                              (other services)
```

### Service Naming

- **Directory names**: kebab-case (e.g., `admin`, `anti-virus`, `go-kms`)
- **Package names**: single word, lowercase (e.g., `admin`, `antivirus`, `gokms`)
- **Main file**: `{service}.go` (e.g., `admin.go`)

### Module Definition

```go
// go.mod
module brainloop

go 1.25.5

// Patched dependencies (local overrides)
replace (
	github.com/coreos/go-oidc => ../../../patched/github.com/coreos/go-oidc
	github.com/gocql/gocql => github.com/scylladb/gocql v1.14.0
	// ... other replacements
)

require (
	// Production dependencies
	github.com/couchbase/gocb/v2 v2.6.0
	github.com/aws/aws-sdk-go-v2 v1.36.5
	// ... others
)
```

---

## Package Organization

### Internal Packages (Unexported)

Located in `{service}/internal/`:

```
admin/internal/
├── db/                      # Database repositories
│   ├── user_repo.go
│   ├── organization_repo.go
│   └── storage.go
├── handlers/                # HTTP request handlers
│   ├── user_handler.go
│   ├── organization_handler.go
│   └── errors.go
├── services/                # Business logic layer
│   ├── user_service.go
│   ├── organization_service.go
│   └── interfaces.go
├── models/                  # Domain models
│   ├── user.go
│   └── organization.go
└── commands/                # CQRS command handlers (if used)
    └── ...
```

**Principles**:
- Code in `internal/` is **private to the service**
- Cannot be imported by other services
- Contains implementation details and internal logic
- Clean architecture: handlers → services → repositories

### Public Packages (Exported)

Located in `{service}/pkg/`:

```
admin/pkg/
├── types.go                 # Public types
├── interfaces.go            # Public interfaces
└── client.go                # Public client/API
```

**Principles**:
- Only essential types and interfaces
- Minimal surface area
- Well-documented
- Stable API contract
- Rarely needed (most communication via REST)

### Shared Packages

Located in `shared/` and `util/`:

```
shared/
├── rest/                    # REST API constants
├── events/                  # Event bus
├── middleware/              # HTTP middleware
├── auth/                    # Authentication
└── ...

util/
├── deployment/              # Kubernetes/deployment utilities
├── httpserver/              # HTTP server setup
├── httpr/                   # HTTP router
├── logging/diagnostics      # Structured logging
├── tracing/                 # Distributed tracing
├── files/                   # File utilities
└── ...
```

---

## Code Organization

### Service Main Entry Point

**File**: `{service}/{service}.go`

```go
package main

import (
	"context"
	"flag"
	"os"
	"os/signal"
	"syscall"

	"brainloop/{service}/internal/db"
	"{service}server" // or "brainloop/{service}/server"
	"brainloop/util/deployment"
	"brainloop/util/logging/diagnostics"
	"brainloop/util/tracing"

	"golang.org/x/sync/errgroup"
)

var (
	// Build variables (set during compilation)
	buildVersion string
	buildDate    string

	// Command-line flags
	cert    = flag.String("cert", "scripts/security/ssl/localhost/localhost.pem", "certificate")
	certKey = flag.String("certkey", "scripts/security/ssl/localhost/localhost.key", "private key")
)

func main() {
	// 1. Setup signal handling
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGQUIT, syscall.SIGTERM)
	defer cancel()

	// 2. Configure logging
	diagnostics.Configure("{service}")
	diagnostics.Noticef(ctx, "Starting {Service} Service - %s - %s", buildVersion, buildDate)

	// 3. Initialize tracing
	closer := tracing.Init("{service}")
	defer closer.Close()

	// 4. Parse command-line flags
	flag.Parse()

	// 5. Initialize database
	db.MustInit(ctx)

	// 6. Setup HTTP server
	mux := httpr.New()
	server.RegisterHTTPHandlers(mux)
	deployment.RegisterHTTPHandlers(ctx, mux,
		deployment.WithPrefix(rest.APIURL{Service}Prefix),
		deployment.WithVersion(rest.ServiceVersionInfo{
			BuildVersion: buildVersion,
			BuildDate:    buildDate,
		}),
		deployment.WithHealthChecks(
			db.HealthCheck([]string{"default"}),
		),
	)
	defer deployment.Shutdown()

	// 7. Start concurrent tasks
	grp, ctx := errgroup.WithContext(ctx)

	grp.Go(func() error {
		return server.ListenCQRS(ctx)
	})

	grp.Go(func() error {
		return httpserver.ListenAndServe(ctx, mux, ports.HTTP)
	})

	// 8. Wait for completion or error
	if err := grp.Wait(); err != nil {
		diagnostics.Criticalf(ctx, "Service error: %v", err)
		os.Exit(1)
	}
}
```

**Structure Pattern**:
1. Signal handling setup
2. Logging initialization
3. Tracing initialization
4. Configuration/flags
5. Database initialization
6. Server/handler setup
7. Concurrent task launch
8. Error handling and shutdown

### Handler Organization

**File**: `{service}/internal/handlers/{entity}_handler.go`

```go
package handlers

import (
	"context"
	"encoding/json"
	"net/http"

	"brainloop/{service}/internal/models"
	"brainloop/{service}/internal/services"
	"brainloop/util/httpr"
	"brainloop/util/logging/diagnostics"
)

// UserHandler handles user-related HTTP requests
type UserHandler struct {
	svc services.UserService
}

// NewUserHandler creates a new user handler
func NewUserHandler(svc services.UserService) *UserHandler {
	return &UserHandler{svc: svc}
}

// GetUser handles GET /users/{id}
func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := httpr.PathParam(r, "id")

	user, err := h.svc.GetUser(ctx, userID)
	if err != nil {
		diagnostics.Warnf(ctx, "Failed to get user: %v", err)
		httpr.WriteError(w, http.StatusNotFound, "User not found")
		return
	}

	httpr.WriteJSON(w, http.StatusOK, user)
}

// CreateUser handles POST /users
func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var req struct {
		Email string `json:"email"`
		Name  string `json:"name"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpr.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	user, err := h.svc.CreateUser(ctx, &models.User{
		Email: req.Email,
		Name:  req.Name,
	})
	if err != nil {
		diagnostics.Warnf(ctx, "Failed to create user: %v", err)
		httpr.WriteError(w, http.StatusInternalServerError, "Failed to create user")
		return
	}

	httpr.WriteJSON(w, http.StatusCreated, user)
}
```

### Service Organization

**File**: `{service}/internal/services/{entity}_service.go`

```go
package services

import (
	"context"

	"brainloop/{service}/internal/models"
	"brainloop/{service}/internal/db"
)

// UserService handles business logic for users
type UserService interface {
	GetUser(ctx context.Context, id string) (*models.User, error)
	CreateUser(ctx context.Context, user *models.User) (*models.User, error)
	DeleteUser(ctx context.Context, id string) error
	ListUsers(ctx context.Context, opts *ListOptions) ([]*models.User, error)
}

// userService implements UserService
type userService struct {
	repo db.UserRepository
}

// NewUserService creates a new user service
func NewUserService(repo db.UserRepository) UserService {
	return &userService{repo: repo}
}

// GetUser retrieves a user by ID
func (s *userService) GetUser(ctx context.Context, id string) (*models.User, error) {
	// Validate input
	if id == "" {
		return nil, ErrUserIDRequired
	}

	// Fetch from repository
	user, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if user == nil {
		return nil, ErrUserNotFound
	}

	return user, nil
}

// CreateUser creates a new user
func (s *userService) CreateUser(ctx context.Context, user *models.User) (*models.User, error) {
	// Validate
	if err := user.Validate(); err != nil {
		return nil, err
	}

	// Save
	created, err := s.repo.Create(ctx, user)
	if err != nil {
		return nil, err
	}

	return created, nil
}
```

### Repository Organization

**File**: `{service}/internal/db/{entity}_repo.go`

```go
package db

import (
	"context"

	"brainloop/{service}/internal/models"
	"brainloop/db"
)

// UserRepository defines data access for users
type UserRepository interface {
	GetByID(ctx context.Context, id string) (*models.User, error)
	Create(ctx context.Context, user *models.User) (*models.User, error)
	Update(ctx context.Context, user *models.User) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, opts *ListOptions) ([]*models.User, error)
}

// userRepository implements UserRepository using database backend
type userRepository struct {
	conn db.Connection
}

// NewUserRepository creates a new user repository
func NewUserRepository(conn db.Connection) UserRepository {
	return &userRepository{conn: conn}
}

// GetByID retrieves a user by ID
func (r *userRepository) GetByID(ctx context.Context, id string) (*models.User, error) {
	// Implementation varies by database backend (Couchbase, Cassandra, DynamoDB)
	// This is abstracted in db package
	var user models.User
	if err := r.conn.QueryOne(ctx, &user, "SELECT * FROM users WHERE id = ?", id); err != nil {
		return nil, err
	}
	return &user, nil
}

// Create inserts a new user
func (r *userRepository) Create(ctx context.Context, user *models.User) (*models.User, error) {
	// Set ID if not provided
	if user.ID == "" {
		user.ID = generateID()
	}

	if err := r.conn.Mutate(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}
```

---

## Naming Conventions

### File Names

| Type | Convention | Example |
|------|-----------|---------|
| Source files | snake_case.go | `user_handler.go`, `admin_service.go` |
| Test files | {name}_test.go | `user_service_test.go` |
| Main entry | {service}.go | `admin.go`, `auth.go` |
| Constants file | constants.go | `constants.go` |
| Models file | {entity}.go | `user.go`, `organization.go` |

### Package Names

- **Single word**: `handlers`, `services`, `models`, `db`
- **Lowercase only**: `admin`, `authorization`, `blocker`
- **No underscores**: Use `httpserver` not `http_server`
- **Avoid abbreviations**: Use `authorization` not `auth` (unless service name)
- Package name must match the directory name, except for `go-kms` which becomes package `gokms`

### Type Names

```go
// ✅ GOOD: Exported, descriptive, descriptive
type UserHandler struct { }
type UserService interface { }
type CreateUserRequest struct { }

// ❌ AVOID: Ambiguous, non-descriptive
type Handler struct { }     // Which handler?
type Service struct { }     // What service?
type Req struct { }         // Request for what?
```

### Variable Names

```go
// ✅ GOOD: Descriptive, clear intent
user := &models.User{...}
userService := NewUserService(repo)
ctx := context.Background()
err := operation()

// ❌ AVOID: Single letter (except i, j for loops), abbreviations
u := &models.User{...}      // Too ambiguous
svc := NewUserService(...)  // Use full word
c := context.Background()   // 'c' doesn't mean context
e := operation()            // 'e' is vague
```

### Constant Names

```go
// ✅ GOOD: UPPER_SNAKE_CASE, descriptive
const (
	DEFAULT_TIMEOUT = 30 * time.Second
	MAX_RETRIES = 3
	USER_BUCKET_NAME = "users"
)

// ❌ AVOID: camelCase for constants
const (
	defaultTimeout = 30 * time.Second
	MaxRetries = 3
)
```

### Interface Names

```go
// ✅ GOOD: {Operation}er or {Entity}Service pattern
type Reader interface { ... }
type Writer interface { ... }
type UserService interface { ... }
type AuthenticationProvider interface { ... }

// ❌ AVOID: "I" prefix (not idiomatic Go)
type IUserService interface { ... }
type IReader interface { ... }
```

---

## Interface Patterns

### Service Interface Pattern

Define interfaces to describe behavior, not implementation:

```go
// ✅ GOOD: Interface describes what you can do
type UserService interface {
	GetUser(ctx context.Context, id string) (*User, error)
	CreateUser(ctx context.Context, user *User) (*User, error)
	UpdateUser(ctx context.Context, user *User) error
	DeleteUser(ctx context.Context, id string) error
}

// Implement the interface
type userService struct {
	repo UserRepository
}

func NewUserService(repo UserRepository) UserService {
	return &userService{repo: repo}
}
```

### Repository Interface Pattern

```go
// Define what data operations are available
type UserRepository interface {
	GetByID(ctx context.Context, id string) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
	Create(ctx context.Context, user *User) (*User, error)
	Update(ctx context.Context, user *User) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, filter *UserFilter) ([]*User, error)
}
```

### Handler Interface Pattern

```go
// HTTP handlers should accept http.ResponseWriter and *http.Request
func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	// Standard HTTP handler signature
}

func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	// Standard HTTP handler signature
}

// Register with router
func RegisterHTTPHandlers(mux *httpr.Mux) {
	h := NewUserHandler(userService)
	mux.HandleFunc("GET /users/{id}", h.GetUser)
	mux.HandleFunc("POST /users", h.CreateUser)
}
```

---

## Error Handling

### Error Definition

```go
package db

import "errors"

// Define package-level errors
var (
	ErrUserNotFound = errors.New("user not found")
	ErrInvalidEmail = errors.New("invalid email format")
	ErrUserExists   = errors.New("user already exists")
	ErrDatabaseDown = errors.New("database unavailable")
)

// For more complex errors, use custom types
type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("validation error on %s: %s", e.Field, e.Message)
}
```

### Error Handling Pattern

```go
func (s *userService) CreateUser(ctx context.Context, user *User) (*User, error) {
	// Validate input first
	if err := user.Validate(); err != nil {
		// Return specific validation error
		return nil, &ValidationError{Field: "email", Message: err.Error()}
	}

	// Try operation
	created, err := s.repo.Create(ctx, user)
	if err != nil {
		// Check for specific error types
		if errors.Is(err, ErrUserExists) {
			return nil, ErrUserExists
		}
		// Log unexpected errors
		diagnostics.Warnf(ctx, "Failed to create user: %v", err)
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return created, nil
}
```

### HTTP Error Response

```go
// In handlers, convert errors to HTTP responses
func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	user, err := h.svc.GetUser(r.Context(), userID)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			httpr.WriteError(w, http.StatusNotFound, "User not found")
			return
		}
		// ✅ GOOD: Use framework utility
    httpr.WriteError(w, http.StatusInternalServerError, "Internal server error")

    // ❌ FORBIDDEN: Standard library direct use
    http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	httpr.WriteJSON(w, http.StatusOK, user)
}
```

### Logging Errors

```go
// Use diagnostics for structured logging
diagnostics.Warnf(ctx, "Operation failed: %v", err)           // Warnings for expected errors
diagnostics.Errorf(ctx, "Unexpected error: %v", err)          // Errors for problems
diagnostics.Criticalf(ctx, "Service unavailable: %v", err)    // Critical for fatal issues
```

---

## Context Usage

### Context Pattern

Every function that can block or interact with external systems should accept `context.Context`:

```go
// ✅ GOOD: Context as first parameter
func (s *userService) GetUser(ctx context.Context, id string) (*User, error) {
	// Use ctx for cancellation and timeouts
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}

	// Pass to database
	return s.repo.GetByID(ctx, id)
}

// ❌ AVOID: No context
func (s *userService) GetUser(id string) (*User, error) {
	// No way to cancel or set timeout
	return s.repo.GetByID(id)
}
```

### Context Creation

```go
// In main, create root context
ctx, cancel := signal.NotifyContext(
	context.Background(),
	os.Interrupt,
	syscall.SIGTERM,
)
defer cancel()

// For operations with timeout
ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
defer cancel()

// For cancellation
ctx, cancel := context.WithCancel(ctx)
defer cancel()
```

### Context in Request Handlers

```go
func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	// Get context from request
	ctx := r.Context()

	// Pass to service
	user, err := h.svc.GetUser(ctx, userID)
	if err != nil {
		// Check for context-specific errors
		if errors.Is(err, context.Canceled) {
			diagnostics.Debugf(ctx, "Request canceled")
			return
		}
		if errors.Is(err, context.DeadlineExceeded) {
			httpr.WriteError(w, http.StatusRequestTimeout, "Request timeout")
			return
		}
		httpr.WriteError(w, http.StatusInternalServerError, "Error")
		return
	}

	httpr.WriteJSON(w, http.StatusOK, user)
}
```

---

## Concurrency Patterns

### Using errgroup

For coordinating multiple goroutines:

```go
import "golang.org/x/sync/errgroup"

func main() {
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt)
	defer cancel()

	grp, ctx := errgroup.WithContext(ctx)

	// Start HTTP server
	grp.Go(func() error {
		return httpserver.ListenAndServe(ctx, mux, ":8080")
	})

	// Start CQRS listener
	grp.Go(func() error {
		return server.ListenCQRS(ctx)
	})

	// Start background job
	grp.Go(func() error {
		return backgroundJob(ctx)
	})

	// Wait for all to complete (or any to error)
	if err := grp.Wait(); err != nil {
		diagnostics.Criticalf(ctx, "Fatal error: %v", err)
		os.Exit(1)
	}
}
```

### Channel Patterns

```go
// Fan-in: Multiple sources to one sink
func merge(ctx context.Context, chans ...<-chan Item) <-chan Item {
	var wg sync.WaitGroup
	out := make(chan Item)

	output := func(c <-chan Item) {
		defer wg.Done()
		for {
			select {
			case <-ctx.Done():
				return
			case item, ok := <-c:
				if !ok {
					return
				}
				select {
				case <-ctx.Done():
					return
				case out <- item:
				}
			}
		}
	}

	wg.Add(len(chans))
	for _, c := range chans {
		go output(c)
	}

	go func() {
		wg.Wait()
		close(out)
	}()

	return out
}
```

---

## Testing Standards

### Test File Organization

**File**: `{service}/internal/{package}/{component}_test.go`

```go
package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"brainloop/{service}/internal/models"
	"brainloop/{service}/internal/services"
)

// MockUserService implements UserService for testing
type MockUserService struct {
	GetUserFunc func(ctx context.Context, id string) (*models.User, error)
}

func (m *MockUserService) GetUser(ctx context.Context, id string) (*models.User, error) {
	return m.GetUserFunc(ctx, id)
}

// Test GetUser handler
func TestUserHandler_GetUser(t *testing.T) {
	mockService := &MockUserService{
		GetUserFunc: func(ctx context.Context, id string) (*models.User, error) {
			return &models.User{ID: id, Name: "John Doe"}, nil
		},
	}

	handler := NewUserHandler(mockService)

	// Create request
	req := httptest.NewRequest("GET", "/users/123", nil)
	w := httptest.NewRecorder()

	// Call handler
	handler.GetUser(w, req)

	// Assert response
	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}
}

// Test error case
func TestUserHandler_GetUser_NotFound(t *testing.T) {
	mockService := &MockUserService{
		GetUserFunc: func(ctx context.Context, id string) (*models.User, error) {
			return nil, ErrUserNotFound
		},
	}

	handler := NewUserHandler(mockService)

	req := httptest.NewRequest("GET", "/users/invalid", nil)
	w := httptest.NewRecorder()

	handler.GetUser(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected status 404, got %d", w.Code)
	}
}
```

### Table-Driven Tests

```go
func TestUserValidation(t *testing.T) {
	tests := []struct {
		name    string
		user    *models.User
		wantErr bool
	}{
		{
			name:    "valid user",
			user:    &models.User{Email: "user@example.com", Name: "John"},
			wantErr: false,
		},
		{
			name:    "missing email",
			user:    &models.User{Name: "John"},
			wantErr: true,
		},
		{
			name:    "invalid email",
			user:    &models.User{Email: "invalid", Name: "John"},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.user.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
```

### Test Naming Convention

```go
// Test methods follow: Test{Component}_{Method}_{Scenario}
func TestUserService_GetUser_Success(t *testing.T) { }
func TestUserService_GetUser_NotFound(t *testing.T) { }
func TestUserService_CreateUser_ValidationError(t *testing.T) { }
```

---

## Documentation Standards

### Package Documentation

```go
// Package admin implements the admin service for managing system configuration
// and user administration.
//
// The admin service provides REST APIs for system administrators to:
// - Manage users and roles
// - Configure system settings
// - View audit logs
//
// All operations require ServerAdmin or ServerSupport roles.
package admin
```

### Type Documentation

```go
// User represents a system user with authentication and role information.
type User struct {
	// ID is the unique identifier for the user
	ID string `json:"id"`

	// Email is the user's email address (unique)
	Email string `json:"email" validate:"required,email"`

	// Name is the user's display name
	Name string `json:"name" validate:"required"`

	// Roles are the roles assigned to this user
	Roles []string `json:"roles"`

	// CreatedAt is when the user was created
	CreatedAt time.Time `json:"createdAt"`
}

// Validate checks if the user data is valid
func (u *User) Validate() error {
	if u.Email == "" {
		return ErrInvalidEmail
	}
	if u.Name == "" {
		return errors.New("name is required")
	}
	return nil
}
```

### Function Documentation

```go
// GetUser retrieves a user by ID from the repository.
//
// Returns ErrUserNotFound if no user with the given ID exists.
// The operation respects context cancellation and timeouts.
func (s *userService) GetUser(ctx context.Context, id string) (*User, error) {
	// implementation
}

// CreateUser creates a new user with the given data.
//
// It validates the user data before creation and returns a
// ValidationError if the data is invalid. Returns ErrUserExists
// if a user with the same email already exists.
func (s *userService) CreateUser(ctx context.Context, user *User) (*User, error) {
	// implementation
}
```

### README Files

Each service should have a `README.md`:

```markdown
# Service: admin

Service `admin` implements REST APIs for system administration tasks.

## Functionality

- User management (create, read, update, delete)
- Role-based access control
- Organization administration
- System configuration

## Configuration

Environment variables:
- `ADMIN_DB_BUCKET`: Database bucket name (default: "admin")
- `ADMIN_CACHE_TTL`: Cache TTL in seconds (default: 300)

## Building

```bash
cd admin
go build -o admin
```

## Running

```bash
./admin -cert path/to/cert.pem -certkey path/to/key.pem
```

## API Documentation

See [openapi/admin.yaml](../openapi/admin.yaml) for complete API specification.

## GDPR Considerations

This service processes personal data including user emails and names.
See [GDPR notes](#gdpr) for compliance details.
```

---

## Configuration Management

### Environment Variables

```go
package configuration

import "os"

// ServiceConfig holds service configuration from environment
type ServiceConfig struct {
	// Database settings
	DBBucket   string
	DBHost     string
	DBUsername string
	DBPassword string

	// Service settings
	Port         int
	LogLevel     int
	TracingURL   string

	// Feature flags
	EnableGDPR   bool
	GDPRChunkSize int
	GDPRCooldown time.Duration
}

// LoadFromEnv loads configuration from environment variables
func LoadFromEnv() *ServiceConfig {
	return &ServiceConfig{
		DBBucket:     os.Getenv("DB_BUCKET"),
		DBHost:       getEnvOrDefault("DB_HOST", "localhost"),
		DBUsername:   os.Getenv("DB_USERNAME"),
		DBPassword:   os.Getenv("DB_PASSWORD"),
		Port:         getEnvOrDefaultInt("PORT", 8080),
		LogLevel:     getEnvOrDefaultInt("LOG_LEVEL", 6),
		TracingURL:   getEnvOrDefault("TRACING_URL", "http://localhost:4318"),
		EnableGDPR:   getEnvOrDefaultBool("GDPR_DELETE_EVENT_STREAM", true),
		GDPRChunkSize: getEnvOrDefaultInt("GDPR_DELETE_EVENT_STREAM_CHUNK_SIZE", 1000),
	}
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
```

### Dependency Injection

```go
// Services are initialized with their dependencies explicitly
func main() {
	// Create database connection
	conn := db.NewConnection(config)

	// Create repositories
	userRepo := db.NewUserRepository(conn)

	// Create services
	userService := services.NewUserService(userRepo)

	// Create handlers
	userHandler := handlers.NewUserHandler(userService)

	// Register handlers
	mux := httpr.New()
	mux.HandleFunc("GET /users/{id}", userHandler.GetUser)
}
```

---

## Common Patterns

### CQRS Pattern

The skeleton package provides CQRS (Command Query Responsibility Segregation) support:

```go
// Write model: Commands modify state
type CreateUserCommand struct {
	Email string
	Name  string
}

// Execute the command
func (cmd *CreateUserCommand) Execute(ctx context.Context) (*User, error) {
	// Validate
	// Save to write model
	// Publish event
	// Return result
}

// Read model: Queries fetch state
type GetUserQuery struct {
	UserID string
}

// Execute the query
func (q *GetUserQuery) Execute(ctx context.Context) (*User, error) {
	// Fetch from read model
	// Return result
}
```

### Health Check Pattern

```go
// Services register health checks for orchestration
func (s *service) HealthCheck(ctx context.Context) error {
	// Check database connectivity
	if err := s.db.Ping(ctx); err != nil {
		return fmt.Errorf("database unavailable: %w", err)
	}

	// Check dependencies
	if err := s.messageBroker.Health(ctx); err != nil {
		return fmt.Errorf("message broker unavailable: %w", err)
	}

	return nil
}
```

### Graceful Shutdown

```go
// Services handle graceful shutdown via context
func (s *service) Shutdown(ctx context.Context) error {
	// Stop accepting new requests
	s.mux.Close()

	// Wait for in-flight requests
	s.wg.Wait()

	// Close connections
	return s.db.Close()
}
```

---

## Code Quality

### Linting & Formatting

```bash
# Format code (automatic)
go fmt ./...

# Run linter (must be installed)
golangci-lint run ./...

# Check for issues
go vet ./...
```

### Code Review Checklist

**Structure & Organization**
- [ ] Packages organized correctly (internal/, pkg/)
- [ ] Imports grouped (stdlib, external, internal)
- [ ] Unexported implementation details in internal/
- [ ] Exported API minimal and clear

**Interfaces & Types**
- [ ] Interfaces define behavior, not implementation
- [ ] Concrete types unexported unless needed
- [ ] Error types clearly defined
- [ ] Type names are descriptive

**Functions & Methods**
- [ ] Single responsibility
- [ ] Clear parameter names
- [ ] Return types explicit (no naked returns)
- [ ] All functions document behavior

**Error Handling**
- [ ] All errors handled explicitly
- [ ] Error messages clear and actionable
- [ ] Custom errors for important failures
- [ ] Logging of errors where appropriate

**Testing**
- [ ] Unit tests for business logic
- [ ] Table-driven tests for multiple scenarios
- [ ] Mock/stub external dependencies
- [ ] At least 80% coverage for critical paths

**Documentation**
- [ ] Package-level documentation
- [ ] Exported types/functions documented
- [ ] Complex logic explained
- [ ] README files present

### Common Issues

```go
// ❌ AVOID: Error swallowing
result, _ := operation()  // Error ignored

// ✅ GOOD: Explicit error handling
result, err := operation()
if err != nil {
	return nil, err
}

// ❌ AVOID: Bare returns
func GetUser() (user *User, err error) {
	user = &User{...}
	return  // Confusing which values returned
}

// ✅ GOOD: Explicit returns
func GetUser() (*User, error) {
	return &User{...}, nil
}

// ❌ AVOID: Large interfaces
type Service interface {
	Get(ctx context.Context, id string) (*Item, error)
	List(ctx context.Context, filter *Filter) ([]*Item, error)
	Create(ctx context.Context, item *Item) (*Item, error)
	Update(ctx context.Context, item *Item) error
	Delete(ctx context.Context, id string) error
	Search(ctx context.Context, query string) ([]*Item, error)
	Export(ctx context.Context, format string) ([]byte, error)
	Import(ctx context.Context, data []byte) error
}

// ✅ GOOD: Focused interfaces
type Reader interface {
	Get(ctx context.Context, id string) (*Item, error)
	List(ctx context.Context, filter *Filter) ([]*Item, error)
}

type Writer interface {
	Create(ctx context.Context, item *Item) (*Item, error)
	Update(ctx context.Context, item *Item) error
	Delete(ctx context.Context, id string) error
}
```

---

## Build & Compilation

### Build Flags

```bash
# Build with version information
go build -ldflags "\
  -X main.buildVersion=1.0.0 \
  -X main.buildDate=$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
  -o admin ./admin

# Build for specific OS/architecture
GOOS=linux GOARCH=amd64 go build -o admin

# Strip debug symbols (reduce size)
go build -ldflags "-s -w" -o admin
```

### Module Management

```bash
# Add a dependency
go get github.com/user/package

# Update dependencies
go get -u ./...

# Clean up unused dependencies
go mod tidy

# Vendor dependencies
go mod vendor

# Check for vulnerabilities
go list -mod=mod -f '{{.Module}}{{.Version}}' all | sort -u
```

### Build Commands

```makefile
# Makefile example
.PHONY: build test lint

build:
	@echo "Building admin service..."
	@go build -ldflags "-X main.buildVersion=$(VERSION)" -o admin ./admin

test:
	@echo "Running tests..."
	@go test -v -race -coverprofile=coverage.out ./...

lint:
	@echo "Running linter..."
	@golangci-lint run ./...

fmt:
	@echo "Formatting code..."
	@go fmt ./...
	@goimports -w .
```

---

## Review Checklist

### Code Quality
- [ ] Follows Go idioms and conventions
- [ ] No unused variables or imports
- [ ] Consistent error handling
- [ ] Context used properly for cancellation
- [ ] No global state (except logging)

### Architecture
- [ ] Clear separation of concerns
- [ ] Unexported implementation details in internal/
- [ ] Services depend on interfaces, not implementations
- [ ] Dependency injection used for testing
- [ ] No circular dependencies

### Testing
- [ ] Unit tests for business logic
- [ ] Error cases tested
- [ ] External dependencies mocked
- [ ] Test names descriptive
- [ ] Sufficient coverage (80%+ for critical code)

### Documentation
- [ ] Package-level documentation present
- [ ] Exported types/functions documented
- [ ] Complex logic explained
- [ ] README file present
- [ ] API documented (OpenAPI if applicable)

### Security
- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] SQL injection protected (parameterized queries)
- [ ] CORS handled appropriately
- [ ] Authentication/authorization enforced

### Performance
- [ ] No unnecessary allocations
- [ ] Efficient algorithms
- [ ] Proper use of defer
- [ ] Resource cleanup
- [ ] Timeouts set for external calls

### Build & Deployment
- [ ] Code builds without warnings
- [ ] Tests pass
- [ ] Linting passes
- [ ] Version info built in
- [ ] Docker/Kubernetes ready

---

## 15. Agent Directives

**Attention `@Builder` and `@Reviewer` Agents:**

1.  **Framework Compliance (Strict):**
    * **Logging:** You are FORBIDDEN from using `fmt.Println`, `log.Println`, or `logrus`. You MUST use `brainloop/util/logging/diagnostics`.
    * **HTTP Responses:** You are FORBIDDEN from using `http.Error` or `json.NewEncoder(w).Encode`. You MUST use `httpr.WriteJSON` and `httpr.WriteError`.
    * **Router:** Do NOT initialize `http.NewServeMux` or `gorilla/mux` directly. You MUST use `httpr.New()`.

2.  **Layering Violations (Immediate Fail):**
    * A `Handler` MUST NOT import a `db` or `repo` package. It must go through a `Service`.
    * A `Service` MUST NOT import `http`. It must be transport-agnostic.
    * A `Model` MUST NOT depend on `db` or `handlers`.

3.  **Error Handling:**
    * Do not just return `err`. You MUST wrap it: `fmt.Errorf("failed to create user: %w", err)`.
    * If a function returns a specific Sentinel Error (e.g., `ErrUserNotFound`), the Handler must check for it using `errors.Is()`.

4.  **Testing:**
    * When generating tests, you MUST use the `MockUserService` pattern shown in Section 9. Do not generate tests that require a running database unless explicitly asked for an "Integration Test".

---

## Additional Resources

### Go Documentation
- [Effective Go](https://golang.org/doc/effective_go)
- [Go Code Review Comments](https://github.com/golang/go/wiki/CodeReviewComments)
- [Go Standard Library](https://pkg.go.dev/std)

### SFS-Specific
- See [bun-typescript-standards.md](bun-typescript-standards.md) for TypeScript code standards
- See [helm-chart-standards.md](helm-chart-standards.md) for Kubernetes deployment standards
- See [secure_coding_guidelines.md](secure_coding_guidelines.md) for security practices

### Testing Tools
- `github.com/stretchr/testify` - Assertions and mocking
- `github.com/golang/mock` - Mock generation
- `gotest.tools/assert` - Advanced assertions