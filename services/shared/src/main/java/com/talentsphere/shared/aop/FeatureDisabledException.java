package com.talentsphere.shared.aop;

public class FeatureDisabledException extends RuntimeException {

    private final String featureName;

    public FeatureDisabledException(String featureName) {
        super("Feature '" + featureName + "' is currently disabled");
        this.featureName = featureName;
    }

    public FeatureDisabledException(String featureName, String message) {
        super(message);
        this.featureName = featureName;
    }

    public String getFeatureName() {
        return featureName;
    }
}