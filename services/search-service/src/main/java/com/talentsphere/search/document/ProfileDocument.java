package com.talentsphere.search.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;
import org.springframework.data.elasticsearch.annotations.Setting;

import java.util.List;

@Document(indexName = "profiles")
@Setting(shards = 1, replicas = 0)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfileDocument {
    @Id
    private String id;
    
    @Field(type = FieldType.Text, analyzer = "standard")
    private String firstName;
    
    @Field(type = FieldType.Text, analyzer = "standard")
    private String lastName;
    
    @Field(type = FieldType.Text, analyzer = "standard")
    private String headline;
    
    @Field(type = FieldType.Text, analyzer = "standard")
    private String summary;
    
    @Field(type = FieldType.Keyword)
    private List<String> skills;
    
    @Field(type = FieldType.Keyword)
    private String location;
    
    @Field(type = FieldType.Keyword)
    private String currentTitle;
    
    @Field(type = FieldType.Keyword)
    private String currentCompany;
}
