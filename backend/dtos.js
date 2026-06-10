
class RegisterDTO {
    constructor(data) {
        this.first_name = data.first_name;
        this.last_name = data.last_name;
        this.email = data.email;
        this.password = data.password;
    }

    isValid() {
        if (!this.first_name) {
            return false;
        }
        if (!this.last_name) {
            return false;
        }
        if (!this.email) {
            return false;
        }
        if (!this.password) {
            return false;
        }
        return true;
    }
}

class LoginDTO {
    constructor(data) {
        this.email = data.email;
        this.password = data.password;
    }

    isValid() {
        if (!this.email) {
            return false;
        }
        if (!this.password) {
            return false;
        }
        return true;
    }
}

class OnboardingDTO {
    constructor(data) {
        this.allergens = data.allergens; 
        this.gps_enabled = data.gps_enabled; 
        this.language = data.language || 'de';
    }
}

class UserResponseDTO {
    constructor(userRow) {
        this.id = userRow.id;
        this.email = userRow.email;
        this.first_name = userRow.first_name;
        this.last_name = userRow.last_name;
        
        if (userRow.allergens) {
            this.allergens = JSON.parse(userRow.allergens);
        } else {
            this.allergens = [];
        }

        if (userRow.gps_enabled === 1) {
            this.gps_enabled = true;
        } else {
            this.gps_enabled = false;
        }

        this.language = userRow.language || 'de';
    }
}

class SymptomLogDTO {
    constructor(data) {
        this.symptoms = data.symptoms; // Expected to be an array of strings
        this.notes = data.notes || '';
        this.date = data.date || new Date().toISOString();
    }

    isValid() {
        if (!this.symptoms) {
            return false;
        }
        if (!Array.isArray(this.symptoms)) {
            return false;
        }
        if (this.symptoms.length === 0) {
            return false;
        }
        return true;
    }
}

module.exports = {
    RegisterDTO,
    LoginDTO,
    OnboardingDTO,
    UserResponseDTO,
    SymptomLogDTO
};
