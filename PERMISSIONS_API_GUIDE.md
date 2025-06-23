# Permissions API Guide

This guide explains how to use the new permissions APIs to create dynamic role management interfaces in your frontend.

## Available API Endpoints

### 1. Get All Available Permissions
```
GET /v1/roles/available-permissions
```

**Response:**
```json
{
  "navigationPermissions": {
    "dashboard": {
      "key": "dashboard",
      "title": "Dashboard",
      "description": "Access to the main dashboard page",
      "path": "/dashboard",
      "category": "main"
    },
    "clients": {
      "key": "clients",
      "title": "Clients",
      "description": "Access to client management pages",
      "path": "/clients",
      "category": "main"
    },
    "settings": {
      "key": "settings",
      "title": "Settings",
      "description": "Access to system settings",
      "category": "settings",
      "children": {
        "activities": {
          "key": "settings.activities",
          "title": "Activities",
          "description": "Manage system activities",
          "path": "/activities",
          "category": "settings"
        }
      }
    }
  },
  "apiPermissions": {
    "getUsers": {
      "key": "getUsers",
      "title": "View Users",
      "description": "Can view user list and details",
      "category": "user_management",
      "group": "users"
    },
    "manageUsers": {
      "key": "manageUsers",
      "title": "Manage Users",
      "description": "Can create, update, and delete users",
      "category": "user_management",
      "group": "users"
    }
  }
}
```

### 2. Get Navigation Permissions Only
```
GET /v1/roles/available-navigation-permissions
```

### 3. Get API Permissions Only
```
GET /v1/roles/available-api-permissions
```

## Frontend Implementation Examples

### React Component for Role Creation/Editing

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const RoleForm = ({ role = null, onSubmit }) => {
  const [availablePermissions, setAvailablePermissions] = useState({});
  const [formData, setFormData] = useState({
    name: role?.name || '',
    description: role?.description || '',
    navigationPermissions: role?.navigationPermissions || {},
    apiPermissions: role?.apiPermissions || {},
    allBranchesAccess: role?.allBranchesAccess || false,
    branchAccess: role?.branchAccess || [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvailablePermissions();
  }, []);

  const fetchAvailablePermissions = async () => {
    try {
      const response = await axios.get('/v1/roles/available-permissions');
      setAvailablePermissions(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setLoading(false);
    }
  };

  const handlePermissionChange = (type, key, value) => {
    setFormData(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [key]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (role) {
        await axios.patch(`/v1/roles/${role.id}`, formData);
      } else {
        await axios.post('/v1/roles', formData);
      }
      onSubmit();
    } catch (error) {
      console.error('Error saving role:', error);
    }
  };

  if (loading) return <div>Loading permissions...</div>;

  return (
    <form onSubmit={handleSubmit} className="role-form">
      <div className="form-section">
        <h3>Basic Information</h3>
        <input
          type="text"
          placeholder="Role Name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
        />
        <textarea
          placeholder="Description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        />
      </div>

      <div className="form-section">
        <h3>Navigation Permissions</h3>
        <div className="permissions-grid">
          {Object.entries(availablePermissions.navigationPermissions).map(([key, permission]) => (
            <div key={key} className="permission-item">
              <label>
                <input
                  type="checkbox"
                  checked={formData.navigationPermissions[key] || false}
                  onChange={(e) => handlePermissionChange('navigationPermissions', key, e.target.checked)}
                />
                <div className="permission-info">
                  <strong>{permission.title}</strong>
                  <p>{permission.description}</p>
                </div>
              </label>
              
              {/* Handle nested permissions (like settings) */}
              {permission.children && (
                <div className="nested-permissions">
                  {Object.entries(permission.children).map(([childKey, childPermission]) => (
                    <label key={childKey} className="nested-permission">
                      <input
                        type="checkbox"
                        checked={formData.navigationPermissions.settings?.[childKey] || false}
                        onChange={(e) => {
                          const newSettings = {
                            ...formData.navigationPermissions.settings,
                            [childKey]: e.target.checked
                          };
                          setFormData(prev => ({
                            ...prev,
                            navigationPermissions: {
                              ...prev.navigationPermissions,
                              settings: newSettings
                            }
                          }));
                        }}
                      />
                      <span>{childPermission.title}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="form-section">
        <h3>API Permissions</h3>
        <div className="permissions-grid">
          {Object.entries(availablePermissions.apiPermissions).map(([key, permission]) => (
            <div key={key} className="permission-item">
              <label>
                <input
                  type="checkbox"
                  checked={formData.apiPermissions[key] || false}
                  onChange={(e) => handlePermissionChange('apiPermissions', key, e.target.checked)}
                />
                <div className="permission-info">
                  <strong>{permission.title}</strong>
                  <p>{permission.description}</p>
                  <small>Category: {permission.category}</small>
                </div>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="form-section">
        <h3>Branch Access</h3>
        <label>
          <input
            type="checkbox"
            checked={formData.allBranchesAccess}
            onChange={(e) => setFormData(prev => ({ ...prev, allBranchesAccess: e.target.checked }))}
          />
          Access to all branches
        </label>
        
        {!formData.allBranchesAccess && (
          <div className="branch-selection">
            {/* Add branch selection component here */}
            <p>Select specific branches for this role</p>
          </div>
        )}
      </div>

      <button type="submit" className="submit-btn">
        {role ? 'Update Role' : 'Create Role'}
      </button>
    </form>
  );
};

export default RoleForm;
```

### Vue.js Component Example

```vue
<template>
  <div class="role-form">
    <form @submit.prevent="handleSubmit">
      <!-- Basic Information -->
      <div class="form-section">
        <h3>Basic Information</h3>
        <input
          v-model="formData.name"
          type="text"
          placeholder="Role Name"
          required
        />
        <textarea
          v-model="formData.description"
          placeholder="Description"
        />
      </div>

      <!-- Navigation Permissions -->
      <div class="form-section">
        <h3>Navigation Permissions</h3>
        <div class="permissions-grid">
          <div
            v-for="(permission, key) in availablePermissions.navigationPermissions"
            :key="key"
            class="permission-item"
          >
            <label>
              <input
                type="checkbox"
                :checked="formData.navigationPermissions[key]"
                @change="updateNavigationPermission(key, $event.target.checked)"
              />
              <div class="permission-info">
                <strong>{{ permission.title }}</strong>
                <p>{{ permission.description }}</p>
              </div>
            </label>
            
            <!-- Nested permissions -->
            <div v-if="permission.children" class="nested-permissions">
              <label
                v-for="(childPermission, childKey) in permission.children"
                :key="childKey"
                class="nested-permission"
              >
                <input
                  type="checkbox"
                  :checked="formData.navigationPermissions.settings?.[childKey]"
                  @change="updateNestedPermission(childKey, $event.target.checked)"
                />
                <span>{{ childPermission.title }}</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- API Permissions -->
      <div class="form-section">
        <h3>API Permissions</h3>
        <div class="permissions-grid">
          <div
            v-for="(permission, key) in availablePermissions.apiPermissions"
            :key="key"
            class="permission-item"
          >
            <label>
              <input
                type="checkbox"
                :checked="formData.apiPermissions[key]"
                @change="updateApiPermission(key, $event.target.checked)"
              />
              <div class="permission-info">
                <strong>{{ permission.title }}</strong>
                <p>{{ permission.description }}</p>
                <small>Category: {{ permission.category }}</small>
              </div>
            </label>
          </div>
        </div>
      </div>

      <button type="submit" class="submit-btn">
        {{ isEditing ? 'Update Role' : 'Create Role' }}
      </button>
    </form>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'RoleForm',
  props: {
    role: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      availablePermissions: {},
      formData: {
        name: this.role?.name || '',
        description: this.role?.description || '',
        navigationPermissions: this.role?.navigationPermissions || {},
        apiPermissions: this.role?.apiPermissions || {},
        allBranchesAccess: this.role?.allBranchesAccess || false,
        branchAccess: this.role?.branchAccess || [],
      },
      loading: true
    };
  },
  computed: {
    isEditing() {
      return !!this.role;
    }
  },
  async mounted() {
    await this.fetchAvailablePermissions();
  },
  methods: {
    async fetchAvailablePermissions() {
      try {
        const response = await axios.get('/v1/roles/available-permissions');
        this.availablePermissions = response.data;
        this.loading = false;
      } catch (error) {
        console.error('Error fetching permissions:', error);
        this.loading = false;
      }
    },
    
    updateNavigationPermission(key, value) {
      this.$set(this.formData.navigationPermissions, key, value);
    },
    
    updateApiPermission(key, value) {
      this.$set(this.formData.apiPermissions, key, value);
    },
    
    updateNestedPermission(key, value) {
      if (!this.formData.navigationPermissions.settings) {
        this.$set(this.formData.navigationPermissions, 'settings', {});
      }
      this.$set(this.formData.navigationPermissions.settings, key, value);
    },
    
    async handleSubmit() {
      try {
        if (this.isEditing) {
          await axios.patch(`/v1/roles/${this.role.id}`, this.formData);
        } else {
          await axios.post('/v1/roles', this.formData);
        }
        this.$emit('saved');
      } catch (error) {
        console.error('Error saving role:', error);
      }
    }
  }
};
</script>
```

### Angular Component Example

```typescript
// role-form.component.ts
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-role-form',
  templateUrl: './role-form.component.html',
  styleUrls: ['./role-form.component.css']
})
export class RoleFormComponent implements OnInit {
  @Input() role: any = null;
  @Output() saved = new EventEmitter<void>();

  availablePermissions: any = {};
  formData: any = {
    name: '',
    description: '',
    navigationPermissions: {},
    apiPermissions: {},
    allBranchesAccess: false,
    branchAccess: []
  };
  loading = true;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.initializeForm();
    this.fetchAvailablePermissions();
  }

  private initializeForm() {
    if (this.role) {
      this.formData = {
        name: this.role.name,
        description: this.role.description,
        navigationPermissions: { ...this.role.navigationPermissions },
        apiPermissions: { ...this.role.apiPermissions },
        allBranchesAccess: this.role.allBranchesAccess,
        branchAccess: [...this.role.branchAccess]
      };
    }
  }

  private async fetchAvailablePermissions() {
    try {
      this.availablePermissions = await this.http.get('/v1/roles/available-permissions').toPromise();
      this.loading = false;
    } catch (error) {
      console.error('Error fetching permissions:', error);
      this.loading = false;
    }
  }

  updateNavigationPermission(key: string, value: boolean) {
    this.formData.navigationPermissions[key] = value;
  }

  updateApiPermission(key: string, value: boolean) {
    this.formData.apiPermissions[key] = value;
  }

  updateNestedPermission(key: string, value: boolean) {
    if (!this.formData.navigationPermissions.settings) {
      this.formData.navigationPermissions.settings = {};
    }
    this.formData.navigationPermissions.settings[key] = value;
  }

  async onSubmit() {
    try {
      if (this.role) {
        await this.http.patch(`/v1/roles/${this.role.id}`, this.formData).toPromise();
      } else {
        await this.http.post('/v1/roles', this.formData).toPromise();
      }
      this.saved.emit();
    } catch (error) {
      console.error('Error saving role:', error);
    }
  }
}
```

```html
<!-- role-form.component.html -->
<div class="role-form" *ngIf="!loading">
  <form (ngSubmit)="onSubmit()">
    <!-- Basic Information -->
    <div class="form-section">
      <h3>Basic Information</h3>
      <input
        [(ngModel)]="formData.name"
        name="name"
        type="text"
        placeholder="Role Name"
        required
      />
      <textarea
        [(ngModel)]="formData.description"
        name="description"
        placeholder="Description"
      ></textarea>
    </div>

    <!-- Navigation Permissions -->
    <div class="form-section">
      <h3>Navigation Permissions</h3>
      <div class="permissions-grid">
        <div
          *ngFor="let permission of availablePermissions.navigationPermissions | keyvalue"
          class="permission-item"
        >
          <label>
            <input
              type="checkbox"
              [checked]="formData.navigationPermissions[permission.key]"
              (change)="updateNavigationPermission(permission.key, $event.target.checked)"
            />
            <div class="permission-info">
              <strong>{{ permission.value.title }}</strong>
              <p>{{ permission.value.description }}</p>
            </div>
          </label>
          
          <!-- Nested permissions -->
          <div *ngIf="permission.value.children" class="nested-permissions">
            <label
              *ngFor="let childPermission of permission.value.children | keyvalue"
              class="nested-permission"
            >
              <input
                type="checkbox"
                [checked]="formData.navigationPermissions.settings?.[childPermission.key]"
                (change)="updateNestedPermission(childPermission.key, $event.target.checked)"
              />
              <span>{{ childPermission.value.title }}</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- API Permissions -->
    <div class="form-section">
      <h3>API Permissions</h3>
      <div class="permissions-grid">
        <div
          *ngFor="let permission of availablePermissions.apiPermissions | keyvalue"
          class="permission-item"
        >
          <label>
            <input
              type="checkbox"
              [checked]="formData.apiPermissions[permission.key]"
              (change)="updateApiPermission(permission.key, $event.target.checked)"
            />
            <div class="permission-info">
              <strong>{{ permission.value.title }}</strong>
              <p>{{ permission.value.description }}</p>
              <small>Category: {{ permission.value.category }}</small>
            </div>
          </label>
        </div>
      </div>
    </div>

    <button type="submit" class="submit-btn">
      {{ role ? 'Update Role' : 'Create Role' }}
    </button>
  </form>
</div>
```

## CSS Styling Example

```css
.role-form {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.form-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
}

.form-section h3 {
  margin-top: 0;
  color: #333;
  border-bottom: 2px solid #007bff;
  padding-bottom: 10px;
}

.permissions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.permission-item {
  background: white;
  padding: 15px;
  border-radius: 6px;
  border: 1px solid #ddd;
}

.permission-item label {
  display: flex;
  align-items: flex-start;
  cursor: pointer;
}

.permission-item input[type="checkbox"] {
  margin-right: 10px;
  margin-top: 3px;
}

.permission-info {
  flex: 1;
}

.permission-info strong {
  display: block;
  margin-bottom: 5px;
  color: #333;
}

.permission-info p {
  margin: 0 0 5px 0;
  color: #666;
  font-size: 14px;
}

.permission-info small {
  color: #999;
  font-size: 12px;
}

.nested-permissions {
  margin-left: 25px;
  margin-top: 10px;
  padding-left: 15px;
  border-left: 2px solid #e0e0e0;
}

.nested-permission {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
}

.nested-permission input[type="checkbox"] {
  margin-right: 8px;
}

.submit-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
}

.submit-btn:hover {
  background: #0056b3;
}

input[type="text"], textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 10px;
}

textarea {
  min-height: 80px;
  resize: vertical;
}
```

## Usage Tips

1. **Load permissions on component mount** - Always fetch available permissions when the component loads
2. **Handle nested permissions carefully** - Settings permissions have nested structure
3. **Validate on frontend** - Add client-side validation before submitting
4. **Show loading states** - Display loading indicators while fetching permissions
5. **Error handling** - Implement proper error handling for API calls
6. **Responsive design** - Make the permission grid responsive for mobile devices

This implementation provides a complete, user-friendly interface for creating and editing roles with granular permissions! 